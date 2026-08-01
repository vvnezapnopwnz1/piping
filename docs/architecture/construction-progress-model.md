# Construction Progress Model Architecture

This document describes the construction progress data model, ledger event architecture, stage projections, and database contracts implemented in Track 05. It serves as the authoritative reference for Track 06 (NDE & Quality), Track 07 (Erection), and Track 08 (System Turnover & Hydrotesting).

---

## 1. The Event Ledger

The core progress state is maintained in an **append-only event log**: `public.construction_progress_events`.

- Every progress transition records a single event row.
- Direct update or deletion of historical progress records is prohibited. Corrections are performed via **compensating events** (`compensates_event_id`).
- The `phase` column (`fabrication`, `erection`, etc.) enables Track 07 to reuse the exact same ledger infrastructure without duplicating tables or functions.
- Command receipts (`public.command_receipts`) enforce idempotency on all mutating RPC operations using client-generated UUID keys (`idempotency_key`).

---

## 2. The Eight Fabrication Stages

Fabrication progress comprises eight ordered stages defined in `public.construction_stage`:

| # | Stage Name | Owner Command / RPC | Note |
|---|---|---|---|
| 1 | `start_fab` | `record_construction_progress` | Explicit event |
| 2 | `material_check` | `record_material_check` | Derived automatically once every ident code has a valid trace |
| 3 | `fabricated` | `spool_fabrication_readiness` | Virtual stage derived when material, shop welds, and supports are 100% complete |
| 4 | `qc_release` | `release_quality_record` | Explicit event gated by 4 readiness checks |
| 5 | `sent_to_paint` | `record_construction_progress` | Explicit event |
| 6 | `painted` | `record_paint_progress` | Explicit event recorded via paint progress RPC |
| 7 | `final_qc` | `record_paint_progress` | Recorded when final QC inspection clears DFT requirements |
| 8 | `laydown` | `record_laydown` | Explicit event capturing storage location |

*Note:* `fabricated` has no event row in `construction_progress_events`. It is derived dynamically in `spool_fabrication_readiness`.

---

## 3. Derived States and Projections

Progress status is queried via real-time database projections and view layers:

- **Material check is derived inside `spool_fabrication_readiness`**: its `bill` lateral reconciles `spool_revision_materials` against `material_check_items`, and an item exists only when the trace resolved to an `active` `piping_material_records` row. There is no separate `is_accepted` flag — the presence of `piping_material_record_id` *is* the acceptance, and the presence of an item *is* the checked line.
- **`spool_fabrication_readiness`**: Computes 4 key readiness checks:
  1. Material Check completeness (`line_checked >= line_total`)
  2. Shop Welding completeness (`weld_complete >= weld_total`)
  3. Support Installation completeness (`support_recorded >= support_total`)
  4. NDE / PWHT clearance (`nde_pending == 0`, `pwht_pending == 0`)
- **`spool_construction_status`**: Aggregates current stage, dates, totals, and release eligibility into a single queryable projection for screens and dashboards.

---

## 4. Revision Binding & Progression

- All construction progress records are strictly bound to `spool_revision_id`.
- Mutating operations against superseded revisions raise error code **`PQC31`**.
- When an engineering revision is accepted, `apply_spooling_import_job` writes `revision_progress_copies` rows *authorizing* a carry-over of `fabrication_start`, `sent_to_paint` and `paint`. It does not perform it. `materialize_progress_copies(isometric_revision_id)` copies each authorized source event onto the new spool revision as a fresh event with `source = 'revision_copy'`, then stamps `revision_progress_copies.copied_payload`; a non-empty payload means "already materialized", so the call is idempotent. `RevisionWorkbench` invokes it for every revision an applied job reports.

---

## 5. The NDE Seam

- Track 05 provides the initial seam for NDE obligations (`nde_obligations`) and PWHT requirements (`pwht_requirements`).
- The RPC `record_nde_obligation_outcome` is an **interim mechanism** in Track 05. Track 06 will replace manual closing with automated NDE batching, joint selection, NDE request workflows, and NDT result logging.

---

## 6. Idempotency Contract

All mutating RPCs accept an `idempotency_key` argument:

1. `public.claim_command_receipt(project_id, command_name, idempotency_key)` is called at the beginning of the function.
2. If already processed, the cached result is returned immediately.
3. `public.complete_command_receipt(receipt_id, result_json)` saves the outcome upon successful execution.

Every future command added in Track 06, 07, and 08 MUST follow this pattern.

---

## 7. Error Code Mapping Table (`PQC30` – `PQC39`)

Custom application errors raised by PL/pgSQL functions:

| Error Code | Meaning | User-Facing Message |
|---|---|---|
| `PQC30` | Entity not found | That spool, joint or record could not be found, or it does not belong to this spool. |
| `PQC31` | Superseded revision | This spool revision is no longer the accepted one. Reload the spool and record work against current revision. |
| `PQC32` | Missing prerequisite stage | An earlier step is missing. Complete the previous fabrication step before recording this one. |
| `PQC33` | Material not in PML | That heat or trace number is not registered in the project PML for this ident code. |
| `PQC34` | Unqualified WPS / Welder | The WPS or the welder qualification does not cover this joint. Check diameter, thickness, material, sub, and expiry. |
| `PQC35` | Invalid weld point allocation | The weld point allocation is not valid. Root+Cap must total 100%, Heat+Fill 0/100%, each point needs different welder. |
| `PQC36` | Joint locked | This joint is locked because an NDE result has been accepted. Use the correction action, which records a reason. |
| `PQC37` | Unreleased quality gates | This spool still has outstanding NDE obligations or PWHT results and cannot be QC released. |
| `PQC38` | Command in progress | The same request is already being processed. Wait for it to finish before retrying. |
| `PQC39` | Missing referential | A project referential this action depends on is missing or archived. Check NDE matrix, paint matrix, material mapping. |

## Known limitations

- `spool_fabrication_readiness` counts every non-removed weld joint of a spool, not only
  `weld_location = 'shop'`. A spool carrying a field or assembly joint can therefore never
  become `is_fabricated` through Shop Weld Progress alone. Track 07 owns those joints and
  must either widen the recording surface or narrow this count.
- `effective_stage_date(uuid, construction_stage)` is a deprecated fabrication-only
  delegate. Track 07 must call
  `effective_stage_date(uuid, construction_phase, construction_stage)`.
