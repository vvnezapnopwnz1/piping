# SpoolGen file contract

PipeQC receives an operator-mediated SpoolGen export on `/spooling/import`: `weld.txt` is required; `trace.txt`, `bolt.txt`, and `supp.txt` are optional. Every file is limited to 4 MB.

Files are tab-delimited; comma-delimited text is accepted as a fallback. The first non-blank line is the header, blank lines are ignored, cells are trimmed, and a UTF-8 BOM is removed. Headers are uppercased and stripped of non-alphanumeric characters before matching their canonical names or aliases in `modules/engineering/domain/spoolgen-contract.ts`.

`weld.txt` supplies ISO, revision, PDS area, service class, spool, weld number/type, diameter, and thickness. Optional decorations identify materials (`trace.txt`), flange joints (`bolt.txt`), and supports (`supp.txt`). An optional-file `(iso_number, spool_number)` must exist in `weld.txt`; otherwise the client reports `ORPHAN_SPOOL`, which is repeated by SQL as `SRV_ORPHAN_SPOOL`.

The column aliases are PipeQC's current compatibility contract, not a claimed SpoolGen vendor specification. When a real export uses a new spelling, extend only the relevant alias array.

## Columns

| File | Required columns | Optional columns |
| --- | --- | --- |
| `weld.txt` | `iso_number`, `revision_number`, `pds_area`, `service_class`, `spool_number`, `weld_number`, `weld_type`, `diameter_inch`, `thickness_mm` | `line_number`, `sheet_number`, `spool_weight_kg`, `material_class`, `weld_location` |
| `trace.txt` | `iso_number`, `spool_number`, `ident_code` | `description`, `quantity`, `unit`, `trace_number` |
| `bolt.txt` | `iso_number`, `spool_number`, `flange_number` | `flange_rating`, `diameter_inch`, `bolt_size`, `bolt_quantity`, `joint_type` |
| `supp.txt` | `iso_number`, `spool_number`, `support_number` | `support_type`, `quantity` |

Numeric columns are `spool_weight_kg`, `diameter_inch`, `thickness_mm`, `quantity`, and `bolt_quantity` when present in their corresponding file. `weld_location` defaults to `shop`; support quantity defaults to `1` in the staging submission.
