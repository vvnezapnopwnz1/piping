# Track 12 — UI-only setup walkthrough (`TRACK-SETUP-CHECK`)

**Document status: source-verified against the code on this branch; live Task 12 pending.**
Every route, control label, persona, capability, business code and expected state below was read
out of the current source tree, migrations and `scripts/demo/manifest.ts` on this branch. **No step
in this document has been executed in a browser or against a live database.** Until Task 12
(Phase C) closes, every "Expected" line is a prediction derived from source, not evidence.

**Owner:** the presenter (product owner), working alone in the browser. No Playwright, no fixture
bootstrap, no SQL, no Supabase Studio, no service-role script, no UUID typing, no source edit.

**What this walkthrough is for.** It answers one question a buyer asks and the main demo cannot:
*"Could I configure a project of my own from nothing, using only the screens, and would the system
tell me when the configuration is good enough?"* It is **optional**, it is **not** a prerequisite
for anything in [`track-12-demo.md`](track-12-demo.md), and it deliberately pollutes the stand — see
§9.

---

## 1. Read this before you plan the session

### 1.1 Creating a project is a platform-admin action

`/admin/project-definition` now carries a **Create Project** card above the existing editor. It is
rendered only when the signed-in account is a platform administrator, because that is exactly what
the database allows:

- policy *"authenticated users can create projects"* checks
  `created_by = auth.uid() and public.is_platform_admin()`
  (`supabase/migrations/20260727145210_project_settings_and_referentials.sql:699-700`);
- the `projects_add_creator_as_admin` trigger then files the creator as the new project's Project
  Admin with `access_role_code = 'project_admin'`
  (`supabase/migrations/20260731090000_access_capability_catalog.sql:243-259`).

The form owns six fields and nothing else. `id`, `status`, the timestamps and both logo paths are
**not** sent: logos are produced by the branding upload after the project exists, and the rest
belong to the server (`lib/project-definition.ts`, `toProjectCreationInsert`). The creator is read
from the authenticated session, never from a form field.

**`TRACK01-B` is not touched by this walkthrough.** It is the sparse isolation control that
`npm run demo:check` depends on — the `isolation` preflight asserts it holds zero reference rows
(`scripts/demo/preflight.ts:696-714`) and `EMPTY_AT_DEMO_START` asserts it carries no operational
rows either (`scripts/demo/manifest.ts:352-374`). Renaming it, reusing it or writing into it would
break that control. `TRACK-SETUP-CHECK` is a genuinely new, third project.

### 1.2 What cannot be reached from the UI at all

Six setup requirements have **no create control on any screen**, so **Gate C can never turn green
through the UI alone** in this release:

| Missing setup code | Panel label | Screen that shows it | Why it is unreachable |
| --- | --- | --- | --- |
| `pressure_unit` | Pressure Unit | Project Referential → *Testpack & Tracking* → **Pressure** | The card renders the stored unit or *"No pressure unit selected."* — there is no add/edit control (`modules/project-setup/ui/execution-reference-tabs.tsx:738-756`) |
| `spooling_material_types` | Spooling Material Types | Project Referential → *Spooling & Painting* → **Spooling** | Read-only card (`extended-reference-tabs.tsx:190-212`) |
| `spooling_material_classes` | Spooling Material Classes | same tab | Read-only card (`extended-reference-tabs.tsx:214-237`) |
| `spooling_checklist` | Spooling Checklist | same tab | Read-only card (`extended-reference-tabs.tsx:239-263`) |
| `ral_codes` | RAL Codes | *Spooling & Painting* → **Painting** | Read-only card (`extended-reference-tabs.tsx:266-292`) |
| `paint_matrix` | Paint Matrix | same tab | Read-only card (`extended-reference-tabs.tsx:294-322`) |

Say this out loud rather than hiding it: **the honest claim is "Gate B: Ready for Import, reached
end-to-end through the screens", not "full green readiness".**

### 1.3 Do not touch System Referential

Material types, film-quantity rules, UT calculation rules and torquing requirements are
**cross-project** rows in `system_reference_entries` / `system_*_rules`. Adding one here would
appear inside `TRACK01-A` as well and would make `npm run demo:check` fail its reference check with
`unexpected keys=…` (`scripts/demo/preflight.ts:649-670`). This walkthrough **reads** the global
material types and **creates none**.

---

## 2. Prepare the stand

Identical to the main runbook §1. Human presenter only.

```bash
npm run demo:prepare -- --confirm-local-reset
npm run dev
```

`demo:prepare` is reset-based: it destroys the local database, recreates the identities, both
projects, access and the whole `TRACK01-A` referential catalogue, then prints one `PASS check=…`
line per contract check. `SUPABASE_SERVICE_ROLE_KEY` and `TRACK01_FIXTURE_PASSWORD` are entered
interactively and masked; they never appear in this document, on a slide, in a screenshot or in
acceptance evidence. See [`track-12-demo.md` §1.1–1.3](track-12-demo.md) for the exact terminal
sequence.

Start state this walkthrough depends on:

- `TRACK01-B` exists with title `PipeQC Isolation Control` and **zero reference rows**;
- `TRACK01-A` exists with its full catalogue — the control group for the isolation checks in §7;
- the six demo accounts exist with the memberships in §3.

---

## 3. Personas

Passwords are typed straight into the login form by the presenter. They appear nowhere in this
document.

| Role in this walkthrough | Email (from `scripts/demo/manifest.ts:435-540`) | Access before §5 | Access after §5 |
| --- | --- | --- | --- |
| Setup operator | `track01.platform-admin@example.test` | platform admin; Project Admin on `TRACK01-A` **and** `TRACK01-B` | unchanged on both, plus **Project Admin** on `TRACK-SETUP-CHECK` by the creation trigger |
| Project Admin under test | `track01.project-admin-a@example.test` | Project Admin on `TRACK01-A`, **Project Reader** on `TRACK01-B` | unchanged on both, plus **Project Admin** on `TRACK-SETUP-CHECK` |
| Project Editor under test | `track01.qc-editor@example.test` | Project Editor on `TRACK01-A` only | unchanged, plus **Project Editor** on `TRACK-SETUP-CHECK` |
| Project Reader under test | `track01.reader-qc@example.test` | Project Reader on `TRACK01-A` only | unchanged, plus **Project Reader** on `TRACK-SETUP-CHECK` |

Why the setup operator is the platform admin: creating a project requires
`public.is_platform_admin()` in the INSERT policy itself (§1.1), and
`track01.platform-admin@example.test` is the only persona `demo:prepare` marks as one
(`manifest.ts:445-462`). No Project Admin, however privileged inside its own project, can create a
new one.

**Switching user** is avatar menu → **Sign out** (top right), then sign in again.
**Switching project** is the project chip in the top bar; it is a dropdown only when the signed-in
user has more than one membership, otherwise it renders as static text
(`components/pipeqc/top-nav.tsx:143-190`).

---

## 4. Business codes used here

Every code below is prefixed `SETUP-` and was checked against `scripts/demo/manifest.ts` — none of
them collides with a `TRACK01-A`/`TRACK01-B` value.

| Thing | Code | Description / values |
| --- | --- | --- |
| Project activity code | `TRACK-SETUP-CHECK` | title `PipeQC Setup Check` — matches `DEMO_MANIFEST.setupProjectCode` (`manifest.ts:412`) |
| Subcontractor | `SETUP-FAB` | `Setup check fabrication contractor` |
| PDS area | `SETUP-PDS-01` | `Setup check design area` |
| Service class | `SETUP-SC-01` | `Setup check carbon steel class`, material type **`CS`** |
| Weld type | `SETUP-BW` | `Setup check butt weld`, counts towards dia-inch |
| WPS | `SETUP-WPS-01` | process `GTAW`, rev `0`, dia 1–24 in, thk 2–30 mm |
| Welder | `SETUP-WDR-01` | `Setup Check Welder`, expiry 12 months out |
| Thickness / flange rule | — | `SETUP-SC-01`, 6 in, 8.2 mm, rating `150#` |
| PML record | `SETUP-ID-100` | MRR `SETUP-MRR-01`, trace `SETUP-HEAT-100` |
| System / subsystem | `SETUP-SYS-01` / `SETUP-SUB-01` | optional extension, §6 |
| Line service | `SETUP-LS-01` | optional extension, §6 |
| Team | `SETUP-TEAM-01` | type **Line Check**, optional extension |
| Location category / location | `SETUP-LOC-CAT` / `SETUP-YARD` | capacity `10`, optional extension |
| Device | `SETUP-PDA-01` | optional extension |

`CS` is not invented: it is one of the three global material types the stand seeds
(`manifest.ts:544-563`).

---

## 5. Claim the project and set its access

Actor for the whole of §5: `track01.platform-admin@example.test`.

**S5.1 — Sign in**
- Route: `http://localhost:3000`
- Actor: `track01.platform-admin@example.test` · password typed at the form
- Controls: **Email**, **Password**, **Sign in** (card title *Sign in to PipeQC*)
- Expected: the shell loads with a project chip in the top bar. Which project it names does not
  matter — do **not** switch to `TRACK01-B`, and do not edit it at any point in this document.

**S5.2 — Create `TRACK-SETUP-CHECK`**
- Route: `/admin/project-definition`
- Actor: platform admin (the **Create Project** card is rendered only for platform admins — §1.1)
- Controls: card *Create a new project* → **Create Project** → dialog *Create Project* →
  **Activity Code**, **Project Title**, **Owner**, **Contractor**,
  **Contract Number (optional)**, **Maximum Transit Time (days)** → **Create Project**
- Values: Activity Code `TRACK-SETUP-CHECK`; Project Title `PipeQC Setup Check`; Owner
  `Setup Owner`; Contractor `Setup EPC`; Contract Number left empty; Maximum Transit Time `3`.
- Expected: toast **`Project TRACK-SETUP-CHECK created`**; the dialog closes; the top-bar chip
  switches to the new project. The creator is filed as its **Project Admin** by the
  `projects_add_creator_as_admin` trigger, so the project appears in the chip dropdown without any
  further access step.
- Field rules from source (`lib/project-definition.ts`): the code is trimmed and upper-cased and
  must match `^[A-Z0-9-]+$`; title/owner/contractor must be non-empty; transit time must be a whole
  number ≥ 1. `TRACK-SETUP-CHECK` satisfies the pattern.
- Hard refresh checkpoint: `Cmd+Shift+R` on `/admin/project-definition`. The *Currently saved* card
  must re-read `TRACK-SETUP-CHECK` from the database.
- **Do not re-submit on an unclear result.** A second submit of the same code is refused with
  **"A project with this activity code already exists."** and creates nothing
  (`unique (activity_code)` on `projects`). If you see that message, the first submit succeeded —
  refresh and read the chip dropdown.
- If the toast reads **"You do not have permission to create projects."** you are not signed in as
  a platform administrator; stop and check the persona.

**S5.3 — Add the Project Admin under test**
- Route: `/admin/access-rights`
- Actor: platform admin · active project `TRACK-SETUP-CHECK`
- Controls: **Add member** → dialog *Add project member* → **Email**, **Access role** → **Save**
- Values: Email `track01.project-admin-a@example.test`; Access role `project admin` (the select
  renders the raw role code with underscores replaced by spaces — `access-member-dialog.tsx`);
  leave **Functional roles** unticked.
- Expected: toast **"Member added"**; a row appears with badge `Project Admin` (the table maps
  codes to those labels — `access-members-table.tsx:9-15`).
- **Add member**, not **Edit**: on a project created seconds ago the only existing membership is
  the creator's. A second **Add member** for the same email is refused with *"Profile is already a
  project member"*
  (`supabase/migrations/20260801095000_security_and_policy_cleanup.sql:52`) and adds nothing.

**S5.4 — Add the Project Editor under test**
- Route: `/admin/access-rights`
- Controls: **Add member** → dialog *Add project member* → **Email**, **Access role**,
  **Functional roles** → **Save**
- Values: Email `track01.qc-editor@example.test`; Access role `project editor`; Functional roles
  tick **qc engineer**.
- Expected: toast **"Member added"**; a new row appears with badge `Project Editor` and functional
  role `qc_engineer`.
- Why a functional role here and not in S5.3/S5.5: `project_editor` does **not** bypass the
  functional gate, so an editor with no functional role holds no module capability at all
  (`20260731090000_access_capability_catalog.sql:38-50`). `project_admin` and `project_reader`
  both bypass it.

**S5.5 — Add the Project Reader under test**
- Route: `/admin/access-rights`
- Controls: **Add member** → **Email**, **Access role** → **Save**
- Values: Email `track01.reader-qc@example.test`; Access role `project reader`; leave Functional
  roles unticked.
- Expected: toast **"Member added"**; the row shows badge `Project Reader`.
- Hard refresh checkpoint: `Cmd+Shift+R` on `/admin/access-rights`. Four rows must return: the
  platform admin (`Project Admin`), `project-admin-a` (`Project Admin`), `qc-editor`
  (`Project Editor`), `reader-qc` (`Project Reader`).
- If a save fails, the screen shows a generic message — *"Access denied"*, *"Access configuration
  is invalid"* or *"Unable to update access"* depending on the SQLSTATE
  (`supabase-access-rights-repository.ts:102-106`). Refresh and read the table before touching the
  dialog again.

---

## 6. Build the dependency chain

Actor for the whole of §6: `track01.platform-admin@example.test` (or, after S5.3,
`track01.project-admin-a@example.test` — both hold `project_referential.manage`).
Active project: `TRACK-SETUP-CHECK`. Every step is on **one route**:

> `/admin/project-referential`

The **Project Setup Readiness** card sits at the top of that page and re-reads
`get_project_setup_readiness` on every page load
(`project-referential-screen.tsx:33-49`, `supabase-setup-readiness-repository.ts:10`). It is the
only place in the application that shows readiness, and it is gated on
`project_referential.manage`, so **only an admin ever sees it**.

Tab strip on that page: **General**, **Welding & Quality**, **Testpack & Tracking**,
**Spooling & Painting**, **System Referentials**, **Progress Weights**
(`project-referential-screen.tsx:75-80`). The card *Welding Procedures (WPS)* sits **below** the
tabs on the same page (`app/admin/project-referential/page.tsx`).

**S6.0 — Record the baseline**
- Expected: badge **Gate B: Incomplete** (amber) and badge **Gate C: Incomplete** (amber), and the
  block *MISSING REFERENTIALS (n)* listing one clickable chip per missing requirement. Each chip
  jumps to the owning tab.
- The chips you should see, with the labels the panel prints
  (`modules/project-setup/domain/setup-readiness.ts:7-36`): Subcontractors · PDS Areas · Service
  Classes · Weld Types · Welding Procedures · Welder Qualifications · NDE Matrix — Shop · NDE
  Matrix — Field · Thickness / Flange Rules · Project Piping Material List · Project Teams ·
  Systems · Subsystems · Line Services · Tracking Locations · Pressure Unit · Prefabrication
  Weights · Painting Weights · Erection Weights · Spooling Material Types · Spooling Material
  Classes · Spooling Checklist · RAL Codes · Paint Matrix · Tracking Devices.
- **Material Types is absent from that list, and that is correct:** the requirement is satisfied by
  the *global* `system_reference_entries` rows, which are not project-scoped
  (`20260801091000_referential_invariants.sql:438`).
- **NDE Matrix — Assembly and Assembly Weights are also absent**, because the project has no
  `project_assembly_settings` row and both requirements are conditional on the assembly extension
  being enabled (`…:476,491`).
- The exact count printed in the header is a **Task 12 assertion**, not a claim of this document
  (§11 item 3).

### The chain, in the order the UI forces

Each step is refused, or its selector is empty, until its predecessor exists. That is the point of
the demonstration — narrate the refusal, do not route around it.

```text
global material type CS ─┬─────────────► service class SETUP-SC-01 ─┬─► NDE matrix rule (shop)
                         │                                          ├─► NDE matrix rule (field)
                         └─► WPS SETUP-WPS-01 ◄─┐                   └─► thickness/flange rule
                                                │
subcontractor SETUP-FAB ─┬──────────────────────┘
                         ├─► welder SETUP-WDR-01 (also needs the WPS)
                         └─► PDS area SETUP-PDS-01 ◄─┐
                                                     │
unit SETUP-U-100 ─► area classification SETUP-AC-01 ─┘

weld type SETUP-BW ─────────────────────────────► NDE matrix rules (both)

PML record SETUP-ID-100 (independent)
```

**S6.1 — Subcontractor**
- Tab **General** → sub-tab **Subcontractors (0)** → **Add Subcontractor**
- Dialog *Add Subcontractor*: **Code** `SETUP-FAB`, **Description / Company Name**
  `Setup check fabrication contractor`, **Contact Details (Optional)** left empty → **Add
  Subcontractor**
- Expected: toast **`Subcontractor "SETUP-FAB" added successfully`**; a row appears with status
  badge `active`; the *Subcontractors* count in the sub-tab header becomes `(1)`.
- The code is trimmed and upper-cased before it is sent
  (`modules/project-setup/domain/reference.ts:16`).

**S6.1a — Unit**
- Tab **General** → sub-tab **Units & Area Classifications** → card *Units* → **Add Unit**
- Dialog *Add Unit*: **Code** `SETUP-U-100`, **Description** `Setup check process unit` →
  **Add Unit**
- Expected: toast **`Unit "SETUP-U-100" added successfully`**; a row appears with status badge
  `active`.
- **Show the dependency first:** before this step the *Add Area Classification* button on the same
  tab is **disabled**, with the hover title *"Add an active unit first — an area classification
  must belong to one"*.
- Units are **not** a setup requirement, so no readiness chip disappears here. This step exists to
  make the PDS area's classification real rather than `(None)`.

**S6.1b — Area classification (depends on the unit)**
- Same sub-tab → card *Area Classifications* → **Add Area Classification**
- Dialog *Add Area Classification*: **Code** `SETUP-AC-01`, **Description**
  `Setup check above-ground area`, **Unit** `SETUP-U-100 — Setup check process unit` →
  **Add Area Classification**
- Expected: toast **`Area classification "SETUP-AC-01" added successfully`**; the row's *Associated
  Unit* column reads `SETUP-U-100`.
- Submitting with no unit selected is refused inline with **"Unit is required"**
  (`modules/project-setup/domain/project-geography.ts`). The column is nullable in the schema, but
  an unlinked classification would break the chain this walkthrough is demonstrating.
- Cross-project units cannot be selected — the select lists this project's active units only, and
  the `assert_same_project_reference('unit_id', 'project_units')` trigger refuses one anyway
  (`20260727145210_project_settings_and_referentials.sql:563-564`).

**S6.2 — PDS area (first setup requirement with a dependency)**
- Tab **General** → sub-tab **PDS Areas (0)** → **Add PDS Area**
- Dialog *Add PDS Area*: **Code** `SETUP-PDS-01`, **Description** `Setup check design area`,
  **Shop Subcontractor** `SETUP-FAB — Setup check fabrication contractor`, **Field Subcontractor**
  the same, **Assembly Subcontractor** `(None)`, **Area Classification**
  `SETUP-AC-01 — Setup check above-ground area`, **Environment** `Above ground`, both checkboxes
  left clear → **Add PDS Area**
- Expected: toast **`PDS Area "SETUP-PDS-01" added successfully`**; the row shows Shop Sub and
  Field Sub `SETUP-FAB`.
- **Show the dependency first:** open this dialog *before* S6.1 and the three subcontractor selects
  offer only **(None)**, and submitting raises the red banner *"At least one ownership
  subcontractor (Shop, Assembly, or Field) is required"*
  (`modules/project-setup/domain/project-geography.ts`).
- Open it before S6.1b and **Area Classification** offers only **(None)** — which is what completes
  the *unit → area classification → PDS area* chain when done in order.

**S6.3 — Service class (depends on the global material type)**
- Tab **Welding & Quality** → sub-tab **Service Classes (0)** → **Add Service Class**
- Dialog *Add Service Class*: **Class Code** `SETUP-SC-01`, **Description (Optional)**
  `Setup check carbon steel class`, **Material Type** `CS — Carbon steel piping material` → **Add
  Service Class**
- Expected: toast **`Service class "SETUP-SC-01" created successfully`**.
- Without a material type the select would read *No active material types* and the dialog would
  refuse with *"Material type is required"*
  (`welding-quality-reference.ts:161`). Here it is populated from the system catalogue, which is
  exactly the system→project link the audience should see.

**S6.4 — Weld type**
- Tab **Welding & Quality** → sub-tab **Weld Types (0)** → **Add Weld Type**
- Dialog *Add Weld Type*: **Weld Code** `SETUP-BW`, **Description** `Setup check butt weld`, leave
  **Counts towards dia-inch progress** ticked → **Add Weld Type**
- Expected: toast **`Weld type "SETUP-BW" created successfully`**.

**S6.5 — WPS (depends on material type *and* subcontractor)**
- Card *Welding Procedures (WPS)* at the bottom of the page → **Add WPS**
- Dialog *Add WPS*: **Code \*** `SETUP-WPS-01`, **Process \*** `GTAW`, **Description**
  `Setup check procedure`, **Material Type \*** `CS`, **Subcontractor \*** `SETUP-FAB — Setup check
  fabrication contractor`, **Diameter From \*** `1`, **Diameter To \*** `24`, **Thickness From \***
  `2`, **Thickness To \*** `30`, **Revision \*** `0`, **Approval Date \*** today or earlier →
  **Save**
- Expected: toast **"WPS created successfully"**; the WPS table gains one `active` row.
- The **Add WPS** button is **disabled** while the project has no material types *or* no
  subcontractors (`components/admin/supabase-wps-tab.tsx:180,191`). Point at that disabled button
  before S6.1 — it is the cleanest visible dependency on the page.

**S6.6 — Welder qualification (depends on subcontractor + WPS)**
- Tab **Welding & Quality** → sub-tab **Welders (0)** → **Add Welder**
- Dialog *Add Welder*: **Welder Stencil** `SETUP-WDR-01`, **Full Name** `Setup Check Welder`,
  **Subcontractor** `SETUP-FAB — Setup check fabrication contractor`, **Certificate Number
  (Optional)** empty, **Certificate Expires On** a date roughly twelve months ahead, **Approved
  WPS** tick `SETUP-WPS-01` → **Add Welder**
- Expected: toast **`Welder "SETUP-WDR-01" qualified successfully`**.
- Both dependencies are visible in the dialog itself: with no subcontractor the select reads *"No
  active subcontractors — add one in Project Geography first"*, and with no procedure the section
  reads *"No active welding procedures — add a WPS on this page first."* At least one WPS is
  mandatory — *"At least one approved WPS is required"*
  (`welding-quality-reference.ts:204-206`), and the server re-checks that every WPS and the
  subcontractor belong to this project
  (`20260801091000_referential_invariants.sql:533-555`).

**S6.7 — NDE matrix rule, shop (depends on service class + weld type)**
- Tab **Welding & Quality** → sub-tab **NDE Matrix (0)** → **Add NDE Rule**
- Dialog *Add NDE Matrix Rule*: **Service Class** `SETUP-SC-01 — Setup check carbon steel class`,
  **Weld Type** `SETUP-BW — Setup check butt weld`, **Weld Location** `Shop`, **Coverage (%)**
  RT `100`, UT `0`, MT `0`, PT `0`, PMI `0`, HT `0`; leave **Material traceability required**
  ticked as it comes and **PWHT required** clear → **Add NDE Rule**
- Expected: toast **"NDE matrix rule created successfully"**; the sub-tab badge is still
  **Incomplete (n)** because the shop/field pair is not yet complete.

**S6.8 — NDE matrix rule, field**
- Same dialog. **Weld Location** `Field`, every coverage `0`.
- Expected: toast **"NDE matrix rule created successfully"**; the **NDE Matrix** sub-tab badge
  flips from **Incomplete (n)** to **Complete**.
- A 0 % rule is a real rule, not an absence: it is what tells the system that a field butt weld in
  this class creates no examination obligation. `TRACK01-A` carries the same asymmetry.
- **Weld Location** offers only `Shop` and `Field`; assembly is a deliberately disabled extension
  point (`welding-quality-tabs.tsx:1500-1512`).

**S6.9 — Thickness / flange rule (depends on service class)**
- Tab **Welding & Quality** → sub-tab **Thickness / Flange (0)** → **Add Rule**
- Dialog *Add Thickness / Flange Rule*: **Service Class** `SETUP-SC-01 — Setup check carbon steel
  class`, **Diameter (inch)** `6`, **Thickness (mm)** `8.2`, **Flange Rating** `150#` → **Add Rule**
- Expected: toast **"Thickness / flange rule created successfully"**.
- The dialog states the downstream consequence itself: a SpoolGen import is refused with
  `SRV_THICKNESS_MISSING` for any joint whose class and diameter no active rule covers.

**S6.10 — PML record**
- Tab **Welding & Quality** → sub-tab **PML Records (0)** → **Add PML Record**
- Dialog *Add PML Record*: **MRR Number** `SETUP-MRR-01`, **Ident Code** `SETUP-ID-100`,
  **Trace / Heat Number** `SETUP-HEAT-100` → **Add PML Record**
- Expected: toast **"Piping material record added successfully"**.

**S6.11 — Gate B checkpoint**
- Hard refresh (`Cmd+Shift+R`) `/admin/project-referential`.
- Expected: the badge reads **Gate B: Ready for Import** in green, the badge **Gate C: Incomplete**
  stays amber, and *MISSING REFERENTIALS (15)* now lists exactly: Project Teams · Systems ·
  Subsystems · Line Services · Tracking Locations · Pressure Unit · Prefabrication Weights ·
  Painting Weights · Erection Weights · Spooling Material Types · Spooling Material Classes ·
  Spooling Checklist · RAL Codes · Paint Matrix · Tracking Devices.
- The badge text is literal: `Gate B: {isGateBReady ? "Ready for Import" : "Incomplete"}` and
  `Gate C: {isAdminDone ? "Referential Complete" : "Incomplete"}`
  (`setup-readiness-panel.tsx:25-32`). Gate B is defined as the twelve import-critical codes;
  Gate C is *"no missing code at all"* (`setup-readiness.ts:45-66`).
- The refresh matters: the panel is computed by an RPC over database rows, so a green Gate B that
  survives `Cmd+Shift+R` is proof of durable configuration, not of page state.

### The readiness ledger

| After step | Missing setup codes that disappear | Still missing, and why |
| --- | --- | --- |
| S6.0 baseline | — | 25 codes; `material_types` already satisfied globally |
| S6.1 | `subcontractors` | — |
| S6.2 | `pds_areas` | — |
| S6.3 | `service_classes` | — |
| S6.4 | `weld_types` | — |
| S6.5 | `welding_procedures` | — |
| S6.6 | `welder_qualifications` | — |
| S6.7 | `nde_matrix_shop` | `nde_matrix_field` still open |
| S6.8 | `nde_matrix_field` | — |
| S6.9 | `thickness_flange_rules` | — |
| S6.10 | `piping_material_records` | **Gate B closes here** |
| §6 optional | `teams`, `systems`, `subsystems`, `line_services`, `locations`, `devices`, `progress_weights_prefabrication`, `progress_weights_painting`, `progress_weights_erection` | — |
| end of walkthrough | — | **6 codes remain forever**: `pressure_unit`, `spooling_material_types`, `spooling_material_classes`, `spooling_checklist`, `ral_codes`, `paint_matrix` — no create control exists (§1.2) |

### Optional extension — the second dependency, and how far Gate C moves

Run these only if you have the time; they change nothing about Gate B.

- **System → Subsystem** is the clearest remaining parent/child rule in the product. Tab **Testpack
  & Tracking** → **Test Pack**: **Add System** (`SETUP-SYS-01` / `Setup check system`) → toast
  **"System created"**. The **Add Subsystem** button stays **disabled** until an active system
  exists (`execution-reference-tabs.tsx:566-583`); then *Add Subsystem* asks for **Parent System**
  `SETUP-SYS-01 — Setup check system`, **Code** `SETUP-SUB-01`, **Description**
  `Setup check subsystem` → **Create** → toast **"Subsystem created"**.
- **Add Line Service** `SETUP-LS-01` / `Setup check line service` → toast **"Line Service created"**.
- Tab **Testpack & Tracking** → **Teams** → **Add Team**: **Code** `SETUP-TEAM-01`,
  **Description** `Setup check line check team`, **Team Type** `Line Check` → **Create** → toast
  **"Team created"**.
- Tab **Testpack & Tracking** → **Tracking**: **Add Category** (`SETUP-LOC-CAT` /
  `Setup check locations`) → toast **"Location category created"**. **Add Location** is disabled
  until a category exists; then **Category** `SETUP-LOC-CAT — Setup check locations`, **Code**
  `SETUP-YARD`, **Description** `Setup check yard`, **Capacity** `10`, **Progress columns** empty →
  **Create** → toast **"Location created"**.
- Tab **Spooling & Painting** → **Devices** → **Add Device**: **Code** `SETUP-PDA-01`,
  **Description** `Setup check PDA` → **Create** → toast **"Device created"**.
- Tab **Progress Weights** → phase **Prefabrication** → **Add Activity**, enter one activity code
  and weight `100` → **Save Weights** → toast **"Prefabrication progress weights saved
  successfully"**. Repeat on **Painting** and **Erection**. The **Save Weights** button stays
  disabled until the *Total* reads exactly `100.00%`
  (`progress-weights-screen.tsx:108,227`). **Assembly** is badged `Disabled` for this project and
  is not required.

After all of that the panel still reads **Gate C: Incomplete** with the six unreachable codes of
§1.2. That is the correct, honest end state — do not promise otherwise.

---

## 7. Access and project isolation

Everything in this section is **expected from source**. None of it has been observed in a browser;
Task 12 confirms it (§11).

### 7.1 What a Project Reader gets, from the capability catalogue

`project_reader` is granted **every non-mutating capability** and **bypasses the functional-role
gate** (`20260731090000_access_capability_catalog.sql:42,109-111`), plus `imports.view`
(`20260802090000_import_platform.sql:89`). It is granted **no** mutating capability, and therefore
not `project.definition.manage`, `project_referential.manage`, `access_rights.manage` or
`system_referential.manage`.

Route protection is a single prefix table (`config/route-capabilities.ts`) applied by
`RouteCapabilityGuard`, which renders the *Access denied* card instead of the page
(`components/pipeqc/route-capability-guard.tsx:41-56`). The sidebar is filtered by the same table
(`config/navigation.ts:359-379`), so a hidden item and a denied route are the same rule seen twice.

### 7.2 Reader protocol

Actor: `track01.reader-qc@example.test` · active project `TRACK-SETUP-CHECK`.

**S7.1 — Sign in and read the shell**
- Sign out of the admin account, sign in as the reader.
- Expected: the top bar shows the project as **static text** `TRACK-SETUP-CHECK · PipeQC Setup
  Check` — this account has exactly one membership, so there is no dropdown, and that is correct,
  not a fault.
- Expected sidebar: SETUP → **Admin Module** is present but contains **only Imports**; PREPARATION,
  CONSTRUCTION, REPORTS, TESTING and CONFIGURATION are present. **Project Definition**, **System
  Referential**, **Project Referential** and **Access Rights** are absent, because each needs a
  mutating capability the reader does not hold.

**S7.2 — Allowed read routes**

| Route | Required capability | Expected |
| --- | --- | --- |
| `/spooling/browse` | `spooling.view` | renders; no isometrics exist in this project |
| `/fabrication/dashboard` | `fabrication.view` | renders; empty |
| `/erection/rft` | `erection.view` | renders; empty; this screen has no release control for anyone by design |
| `/tracking/data-analysis` | `tracking.view` | renders; empty |
| `/nde` | `nde.view` | renders; batch table empty |
| `/testpack` | `testpack.view` | renders; zero packs |
| `/flange` | `flange.view` | renders in **browse** mode — `app/flange/page.tsx` passes `canManage={false}` unconditionally |
| `/reports` | `reports.view` | renders both report cards |
| `/admin/imports` | `imports.view` | renders; no import jobs |

**S7.3 — Mutation controls are absent, not merely inert**
- Route: `/erection/flange-progress` (required capability `flange.view`, so the reader **reaches
  it**)
- Expected: the worklist renders, and the whole *record* form is **not rendered at all** — the
  screen only emits it when `canManage` is true, and the page derives `canManage` from
  `flange.manage`, which a reader does not hold
  (`app/erection/flange-progress/page.tsx`, `modules/flange/ui/flange-management-screen.tsx:106`).
- Same pattern on `/admin/project-referential` if it were reachable: every **Add …** button is
  wrapped in `{canManage && …}`. The reader cannot reach that route at all, so the check to record
  is the flange screen.
- **Do not** attempt to force a mutation from the reader session. Confirming the control is absent
  is the assertion; provoking a 403 write is not required by this walkthrough.

**S7.4 — Direct-route denial**
- Type each route into the address bar as the reader and record the rendered card:

| Route typed | Capability required | Expected card |
| --- | --- | --- |
| `/admin/project-referential` | `project_referential.manage` | *Access denied* — "You do not have access to **Project Referential** in project TRACK-SETUP-CHECK." |
| `/admin/access-rights` | `access_rights.manage` | *Access denied* — "…access to **Access Rights** in project TRACK-SETUP-CHECK." |
| `/admin/project-definition` | `project.definition.manage` | *Access denied* — "…access to **Project Definition** in project TRACK-SETUP-CHECK." |
| `/fabrication/weld-progress` | `fabrication.progress.record` | *Access denied* — "…access to **Fabrication** in project TRACK-SETUP-CHECK." |
| `/fabrication/qc-release` | `fabrication.qc.release` | *Access denied* — "…access to **Fabrication** in project TRACK-SETUP-CHECK." |
| `/admin/system-referential` | `system_referential.manage` | *Access denied* — "…access to **System Referential** in project TRACK-SETUP-CHECK." |

The card title is literally **Access denied**, the body is
*"You do not have access to {section} in project {code}."*, the footer button is **Go to Home**
(`components/auth/forbidden-screen.tsx`). The section names come from
`CAPABILITY_SECTION_LABELS` in the guard; the project code is the active project's activity code.

`/admin/system-referential` is denied to the **Project Admin under test as well** — only a platform
administrator holds `system_referential.manage`. Show that too; it is the cleanest demonstration
that project admin ≠ system admin.

**S7.5 — What the Reader cannot see about readiness**
- The **Project Setup Readiness** card lives only on `/admin/project-referential`, which is gated on
  `project_referential.manage`. A Project Reader therefore **never sees readiness at all** — not a
  greyed-out version, not a read-only version. State this plainly rather than implying a read-only
  readiness view exists.

### 7.3 Project isolation across the TopNav switch

Actor: `track01.project-admin-a@example.test` — after S5.3 this account is Project Admin on
**both** `TRACK-SETUP-CHECK` and `TRACK01-A`, so its top bar has a real project dropdown.

**S7.6 — `TRACK-SETUP-CHECK` data is absent in `TRACK01-A`**
- Route: `/admin/project-referential` · project chip → `TRACK01-A`
- Expected: tab **General** → **Subcontractors** lists `FAB-A`, `NDE-A`, `LEGACY-CONTRACTOR` and
  **not** `SETUP-FAB`; **PDS Areas** lists `PDS-100`, `PDS-200`, `PDS-300` and **not**
  `SETUP-PDS-01`; tab **Welding & Quality** → **Service Classes** lists `SC-CS150`, `SC-SS300` and
  **not** `SETUP-SC-01`; **PML Records** does not contain `SETUP-ID-100`.
- Expected: both readiness badges on `TRACK01-A` are still green — the setup work did not disturb
  the golden project.

**S7.7 — `TRACK01-A` golden references are absent in the setup project**
- Route: `/admin/project-referential` · project chip → `TRACK-SETUP-CHECK`
- Expected: **Subcontractors** contains only `SETUP-FAB` — no `FAB-A`, no `NDE-A`, no
  `LEGACY-CONTRACTOR`; **PDS Areas** contains only `SETUP-PDS-01` — no `PDS-100`; **Service
  Classes** contains only `SETUP-SC-01` — no `SC-CS150`; **Welders** contains only `SETUP-WDR-01` —
  no `WDR-001`…`WDR-004`; the **Welding Procedures (WPS)** card contains only `SETUP-WPS-01` — no
  `WPS-CS-GTAW-01`, no `WPS-LEGACY-04`.
- Expected: **System Referentials** tab shows the *same* global material types `CS`, `SS316`, `DSS`
  in both projects. That is not a leak — it is the one deliberately shared scope, and it is why
  §1.3 forbids editing it.
- Hard refresh checkpoint: `Cmd+Shift+R` after each switch, then re-read the tab. Project scoping
  is enforced server-side, so the lists must be identical after a reload.

### 7.4 Expected-from-source vs observed evidence

Everything in §5–§7 is **expected from source**. This document contains **no observed live
evidence**. The boundary is deliberate: Task 12 runs these steps in a browser and either confirms
each expectation or corrects this file. Do not quote any line here as "verified in the app".

---

## 8. Recovery rules

1. **Ambiguous mutation — refresh, inspect, do not auto-retry.** If a click produced no toast, or
   you are unsure whether it landed: hard refresh the route and read the durable state (the table
   row, the status badge, the readiness chips, the *Currently saved* card). Act only on what the
   refreshed screen says.
2. **Read the refusal.** Disabled buttons and inline field errors name the missing prerequisite in
   business terms — *"At least one ownership subcontractor (Shop, Assembly, or Field) is required"*,
   *"At least one approved WPS is required"*, *"No active subcontractors — add one in Project
   Geography first"*, *"Total must equal exactly 100%"*. Satisfy the refusal; do not work around it.
3. **A duplicate code fails at the database, not in the form.** Re-adding an existing code produces
   the screen's generic failure toast (*"Failed to add …"*). Refresh and check the table before
   trying a different code.
4. **Never repair state from outside the UI.** No SQL, no Supabase Studio, no service-role script,
   no direct table edit. If the state cannot be reached through the screens, the walkthrough is
   over — go to §9.
5. **Never create or edit a System Referential row** to unblock yourself (§1.3).

---

## 9. Cleanup — and why you must do it before the main demo

The **only** cleanup is a full re-preparation:

```bash
npm run demo:prepare -- --confirm-local-reset
npm run dev
```

There is no project-delete flow in this application, and this document does not invent one. That
is precisely why the stand must be re-prepared: the third project cannot be removed from the UI.

What is now true of the stand:

- a **third** project row, `TRACK-SETUP-CHECK`, exists alongside `TRACK01-A` and `TRACK01-B`, with
  its own references, memberships and audit events;
- `TRACK01-A` and `TRACK01-B` are **unchanged** — this walkthrough never writes to either, so the
  `projects` field-by-field comparison and the `isolation` zero-reference assertion still describe
  them accurately (`scripts/demo/preflight.ts:324-360,696-714`).

Whether `npm run demo:check` tolerates the extra project or reports it is a **Task 12 assertion**
(§11 item 14), not a claim of this document: the checks were written against a two-project stand.
Either way the rule is the same — re-prepare before the main demo. Re-preparing destroys everything
created here and restores the stand to the state the presenter runbook assumes.

---

## 10. Source-audit appendix

Every route, literal label and rule used above, with the file it was read from. This is what
"static source-verified" means in the status line. Where the body text shortens a path to a bare
filename (`welding-quality-tabs.tsx:219`), the full path is in this table and the basename is
unique in the repository.

| Route / control | Literal label quoted above | Source |
| --- | --- | --- |
| `/` login | *Sign in to PipeQC*, **Email**, **Password**, **Sign in** | `components/auth/login-screen.tsx` |
| shell | project chip, dropdown, **Sign out**, **Toggle Sidebar** | `components/pipeqc/top-nav.tsx:143-190`, `components/ui/sidebar.tsx` |
| sidebar filtering | items hidden when the route capability is not held | `config/navigation.ts:359-379` |
| route gating | prefix → capability table; *Access denied* card | `config/route-capabilities.ts`, `components/pipeqc/route-capability-guard.tsx:41-56`, `components/auth/forbidden-screen.tsx` |
| capability model | `project_reader` gets every non-mutating capability and bypasses the functional gate; `project_editor` does not bypass it | `supabase/migrations/20260731090000_access_capability_catalog.sql:38-50,86-111` |
| `imports.view` for readers | `/admin/imports` visible to a reader | `supabase/migrations/20260802090000_import_platform.sql:77-89` |
| `/admin` | card *Project Definition* — "Create and configure the active project record." | `app/admin/page.tsx` |
| `/admin/project-definition` | *Create a new project*, **Create Project**, dialog *Create Project* (**Activity Code**, **Project Title**, **Owner**, **Contractor**, **Contract Number (optional)**, **Maximum Transit Time (days)**), toast `Project <CODE> created`; *Currently saved*, *Edit project record*, **Save project definition**, toast `Project definition saved` | `app/admin/project-definition/page.tsx` |
| project creation | platform-admin only; six-field payload; `created_by` from the session; duplicate code → "A project with this activity code already exists."; RLS refusal → "You do not have permission to create projects." | `lib/project-definition.ts` (`validateProjectCreation`, `toProjectCreationInsert`), `lib/supabase/project-definition.ts` (`createProjectDefinition`) |
| creation policy and trigger | `created_by = auth.uid() and public.is_platform_admin()`; creator filed as `project_admin` | `20260727145210_project_settings_and_referentials.sql:699-700`, `20260731090000_access_capability_catalog.sql:243-259` |
| project definition rules | `^[A-Z0-9-]+$`; required title/owner/contractor; transit ≥ 1 whole day | `lib/project-definition.ts` |
| `/admin/access-rights` | **Add member**, **Edit**, **Deactivate**, dialog *Add project member* / *Edit access*, **Email**, **Access role**, **Functional roles**, **Save**, toasts `Member added` / `Access updated` | `modules/access/ui/access-rights-screen.tsx`, `access-member-dialog.tsx`, `access-members-table.tsx:9-15` |
| duplicate member | *"Profile is already a project member"* | `supabase/migrations/20260801095000_security_and_policy_cleanup.sql:52` |
| `/admin/project-referential` | *Project Setup Readiness*, **Gate B: Ready for Import** / **Gate B: Incomplete**, **Gate C: Referential Complete** / **Gate C: Incomplete**, *Missing Referentials (n)*; tabs **General**, **Welding & Quality**, **Testpack & Tracking**, **Spooling & Painting**, **System Referentials**, **Progress Weights**; card *Welding Procedures (WPS)* | `modules/project-setup/ui/setup-readiness-panel.tsx:23-49`, `project-referential-screen.tsx:75-105`, `app/admin/project-referential/page.tsx` |
| readiness computation | RPC `get_project_setup_readiness`; global material types; assembly-conditional codes | `modules/project-setup/infrastructure/supabase-setup-readiness-repository.ts:10`, `supabase/migrations/20260801091000_referential_invariants.sql:383-504` |
| Gate B / Gate C definition | 12 import-critical codes; Gate C = zero missing | `modules/project-setup/domain/setup-readiness.ts:45-66` |
| missing-code labels | Subcontractors, PDS Areas, … Tracking Devices | `modules/project-setup/domain/setup-readiness.ts:7-36` |
| General tab | sub-tabs **Subcontractors (n)**, **Units & Area Classifications (n)**, **PDS Areas (n)**; **Add Subcontractor**, **Add PDS Area**; dialogs *Add Subcontractor* (**Code**, **Description / Company Name**, **Contact Details (Optional)**) and *Add PDS Area* (**Code**, **Description**, **Shop/Assembly/Field Subcontractor**, **Area Classification**, **Environment**, the two checkboxes); toasts `Subcontractor "X" added successfully`, `PDS Area "X" added successfully` | `modules/project-setup/ui/project-geography-tabs.tsx:252-689` |
| PDS rule | at least one ownership subcontractor required | `modules/project-setup/domain/project-geography.ts:104-107` |
| Units / Area Classifications | cards *Units* and *Area Classifications*; **Add Unit** (**Code**, **Description**), **Add Area Classification** (**Code**, **Description**, **Unit**) — the latter disabled until an active unit exists; toasts `Unit "X" added successfully`, `Area classification "X" added successfully`; **Unit** is required | `modules/project-setup/ui/project-geography-tabs.tsx`, `modules/project-setup/domain/project-geography.ts` (`validateUnitInput`, `validateAreaClassificationInput`) |
| unit ↔ area classification project integrity | `assert_same_project_reference('unit_id', 'project_units')` | `20260727145210_project_settings_and_referentials.sql:563-564` |
| Welding & Quality tab | sub-tabs **Service Classes**, **Weld Types**, **Welders**, **NDE Matrix** (+ badge **Complete** / **Incomplete (n)**), **Thickness / Flange**, **PML Records**, **Rework Codes**, **Joint Categories**; buttons **Add Service Class**, **Add Weld Type**, **Add Welder**, **Add NDE Rule**, **Add Rule**, **Add PML Record**; toasts `Service class "X" created successfully`, `Weld type "X" created successfully`, `Welder "X" qualified successfully`, `NDE matrix rule created successfully`, `Thickness / flange rule created successfully`, `Piping material record added successfully` | `modules/project-setup/ui/welding-quality-tabs.tsx:219,258,307,352,431,470,544-1090,1090-1670` |
| Welding & Quality validation | material type required; subcontractor + ≥1 WPS required; service class + weld type required; flange rating required; MRR/ident/trace required | `modules/project-setup/domain/welding-quality-reference.ts:156-300` |
| WPS card | **Add WPS** disabled without material types or subcontractors; dialog *Add WPS* fields **Code \***, **Process \***, **Description**, **Material Type \***, **Subcontractor \***, **Diameter From/To \***, **Thickness From/To \***, **Revision \***, **Approval Date \***, **Save**; toast `WPS created successfully` | `components/admin/supabase-wps-tab.tsx:160,180,191,296-400`, `lib/welding-procedures.ts:64-110` |
| Testpack & Tracking tab | tabs **Teams (n)**, **Test Pack**, **Tracking**, **Pressure**; **Add Team**, **Add System**, **Add Subsystem** (disabled with no active system), **Add Line Service**, **Add Category**, **Add Location** (disabled with no category), **Create**; toasts `Team created`, `System created`, `Subsystem created`, `Line Service created`, `Location category created`, `Location created`; Pressure Unit card is read-only | `modules/project-setup/ui/execution-reference-tabs.tsx:56-62,169-319,420-426,566-583,670-756,795-920` |
| Spooling & Painting tab | tabs **Spooling**, **Painting**, **Assembly**, **Devices (n)**; Spooling/Painting cards read-only; **Add Device** dialog **Code**, **Description**, **Create**; toast `Device created` | `modules/project-setup/ui/extended-reference-tabs.tsx:112,183-322,385-500` |
| Progress Weights tab | phases **Prefabrication**, **Painting**, **Assembly** (badge `Disabled`), **Erection**; **Add Activity**, **Save Weights** (disabled until Total is 100.00%); toast `<Phase> progress weights saved successfully` | `modules/project-setup/ui/progress-weights-screen.tsx:30-35,108,138,164-283` |
| System Referential is global | entries are read without a project filter; management needs a **global** capability | `modules/project-setup/infrastructure/supabase-system-referential-repository.ts:25-39` |
| `/flange` read-only | `canManage={false}` unconditionally | `app/flange/page.tsx` |
| `/erection/flange-progress` | form rendered only when `canManage` | `app/erection/flange-progress/page.tsx`, `modules/flange/ui/flange-management-screen.tsx:106` |
| personas, project rows, `TRACK-SETUP-CHECK`, `CS`/`SS316`/`DSS`, `FAB-A`, `PDS-100`, `SC-CS150`, `WDR-00x`, `WPS-*` | every email, code and title quoted above | `scripts/demo/manifest.ts:412-433,435-540,543-563` |
| empty isolation project | `isolation` check requires reference count 0; `EMPTY_AT_DEMO_START` requires zero operational rows | `scripts/demo/preflight.ts:696-714`, `scripts/demo/manifest.ts:352-374` |
| cleanup consequences | `projects` check compares both project rows field-by-field; reference check reports `unexpected keys` | `scripts/demo/preflight.ts:324-360,649-670` |
| commands | `demo:prepare`, `demo:check` | `package.json:19-20` |

---

## 11. Live-only assertions for Task 12

Each of these is an expectation from source that only a browser run can settle.

1. **Create Project** is visible to the platform admin and absent for every other persona; it
   creates `TRACK-SETUP-CHECK`, the chip switches to it without a reload, the creator's Project
   Admin membership is present in `/admin/access-rights` immediately, and the project survives a
   hard refresh. A second submit of the same code reports the duplicate message and creates no
   second row.
2. The **Project Setup Readiness** panel renders for a project with no references at all, rather
   than erroring — confirm the *Missing Referentials* block and the amber badge pair.
3. The **exact baseline missing count** on the freshly claimed project (predicted 25) and the exact
   list, including the absence of Material Types, NDE Matrix — Assembly and Assembly Weights.
4. Gate B flips to **Ready for Import** after S6.10 and stays green across `Cmd+Shift+R`.
5. Every toast string quoted in §5–§6 appears verbatim, and every button label matches.
6. **Add WPS** and **Add Subsystem** and **Add Location** really are disabled before their
   prerequisites exist, and enable afterwards.
7. **Add Area Classification** really is disabled until a unit exists, the unit-less submit really
   is refused with *"Unit is required"*, and the *Add PDS Area* **Area Classification** select
   really offers `SETUP-AC-01` after S6.1b.
8. The **NDE Matrix** sub-tab badge really flips from **Incomplete (n)** to **Complete** after the
   field rule.
9. Gate C is still **Incomplete** at the end, listing exactly the six unreachable codes of §1.2.
10. Each Reader denial in S7.4 renders the *Access denied* card with the predicted section name and
    the project code `TRACK-SETUP-CHECK`.
11. The Reader's sidebar really contains **Admin Module → Imports** and nothing else under SETUP.
12. `/erection/flange-progress` really renders no record form for the Reader.
13. Both isolation directions in S7.6/S7.7, including that the global material types are visible in
    both projects.
14. What `npm run demo:check` does with a **third** project on the stand: whether it passes
    (because `TRACK01-A`/`TRACK01-B` are untouched) or reports the extra project. Record the exact
    check names either way — and confirm it passes again after
    `demo:prepare -- --confirm-local-reset`.
15. `TRACK01-A` and `TRACK01-B` are untouched after the walkthrough: `TRACK01-B` still reports zero
    reference rows and its original title `PipeQC Isolation Control`.
16. Whether the walkthrough fits a sensible session: it is one project creation, 3 access changes
    and 12 durable referential mutations, on three routes.

---

## 12. Unresolved blockers

1. **Gate C is unreachable through the UI.** Six setup requirements have no create control anywhere
   (§1.2). Until that changes, no UI-only path can produce a fully green readiness panel on a new
   project, and no document should promise one. The honest claim remains **"Gate B: Ready for
   Import, reached end-to-end through the screens"**.
2. **The stand cannot be cleaned from the UI.** `TRACK-SETUP-CHECK` has no delete control, so the
   only way back to a two-project stand is `demo:prepare -- --confirm-local-reset` (§9). Whether
   `demo:check` should tolerate a third project is a product decision, not a documentation one.
3. **`demo:check` was written against a two-project stand.** Its `projects` comparison and
   `isolation` assertion both describe `TRACK01-A`/`TRACK01-B` only. This walkthrough leaves both
   untouched, so no assertion about them should break — but that prediction is a Task 12 item
   (§11 item 14), not an observation.
4. **On a stand with no active project at all, the platform admin cannot reach Create Project.**
   The control lives on `/admin/project-definition`, and the shell needs an active project to route
   there. `demo:prepare` always leaves two projects, so this does not affect this walkthrough; it
   would affect a genuinely empty installation.

---

## 13. Related documents

- Presenter runbook: [`docs/runbooks/track-12-demo.md`](track-12-demo.md)
- Local entry point and role boundary:
  [`docs/qa/local-supabase-browser-runbook.md`](../qa/local-supabase-browser-runbook.md)
- Plan: [`docs/superpowers/plans/2026-08-10-track-12-demo-release.md`](../superpowers/plans/2026-08-10-track-12-demo-release.md)
- Design: [`docs/superpowers/specs/2026-08-10-track-12-demo-release-design.md`](../superpowers/specs/2026-08-10-track-12-demo-release-design.md)
