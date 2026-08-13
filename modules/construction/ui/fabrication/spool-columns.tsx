import { StatusBadge } from "@/components/ui/status-badge"
import type { DataColumn } from "@/components/ui/data-table"
import type { SpoolStatus } from "../../infrastructure/supabase-construction-repository"

/** Sorts on how far along the work is, so "3/12" and "3/400" do not land next to each other. */
const ratio = (done: number, total: number) => (total === 0 ? 1 : done / total)

/**
 * `spool_status` already carries every counter a fabrication operator narrows by — lines checked,
 * welds complete, supports recorded, NDE and PWHT still open. The old picker showed the spool
 * number and the stage and threw the rest away, which is why "which spools are waiting on NDE"
 * was a question nobody could answer from this screen.
 */
export const FABRICATION_SPOOL_COLUMNS: ReadonlyArray<DataColumn<SpoolStatus>> = [
  {
    id: "spoolNumber",
    header: "Spool",
    value: (spool) => spool.spoolNumber,
    searchable: true,
    filter: "text",
    pinned: true,
    alwaysVisible: true,
    className: "font-mono text-xs",
    cell: (spool) => (
      <>
        {spool.spoolNumber}
        <span className="text-muted-foreground ml-2">{spool.revisionNumber}</span>
      </>
    ),
  },
  {
    id: "isoNumber",
    header: "ISO",
    value: (spool) => spool.isoNumber,
    searchable: true,
    filter: "text",
    className: "font-mono text-xs",
  },
  {
    id: "currentStage",
    header: "Stage",
    value: (spool) => spool.currentStage ?? "not_started",
    filter: "select",
    cell: (spool) => <StatusBadge status={spool.currentStage ?? "not_started"} />,
  },
  {
    id: "material",
    header: "Material",
    numeric: true,
    value: (spool) => ratio(spool.lineChecked, spool.lineTotal),
    cell: (spool) => `${spool.lineChecked}/${spool.lineTotal}`,
  },
  {
    id: "welds",
    header: "Welds",
    numeric: true,
    value: (spool) => ratio(spool.weldComplete, spool.weldTotal),
    cell: (spool) => `${spool.weldComplete}/${spool.weldTotal}`,
  },
  {
    id: "supports",
    header: "Supports",
    numeric: true,
    value: (spool) => ratio(spool.supportRecorded, spool.supportTotal),
    cell: (spool) => `${spool.supportRecorded}/${spool.supportTotal}`,
  },
  { id: "ndePending", header: "NDE open", numeric: true, value: (spool) => spool.ndePending, filter: "number" },
  { id: "pwhtPending", header: "PWHT open", numeric: true, value: (spool) => spool.pwhtPending, filter: "number" },
  {
    id: "isReleasable",
    header: "Releasable",
    value: (spool) => spool.isReleasable,
    filter: "boolean",
    cell: (spool) =>
      spool.isReleasable ? <StatusBadge status="ready" label="Releasable" /> : null,
  },
]

