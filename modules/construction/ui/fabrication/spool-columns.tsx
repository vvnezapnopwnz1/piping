import { StatusBadge } from "@/components/ui/status-badge"
import type { DataColumn } from "@/components/ui/data-table"
import type { useTranslations } from "next-intl"

import type { CodesTranslator } from "@/i18n/translator"
import type { SpoolStatus } from "../../infrastructure/supabase-construction-repository"

/** Sorts on how far along the work is, so "3/12" and "3/400" do not land next to each other. */
const ratio = (done: number, total: number) => (total === 0 ? 1 : done / total)

/**
 * `spool_status` already carries every counter a fabrication operator narrows by — lines checked,
 * welds complete, supports recorded, NDE and PWHT still open. The old picker showed the spool
 * number and the stage and threw the rest away, which is why "which spools are waiting on NDE"
 * was a question nobody could answer from this screen.
 */
/** Headers come from `fabrication.columns`, stage labels from `codes`. */
export type SpoolColumnsTranslator = ReturnType<typeof useTranslations<"fabrication.columns">>

export function fabricationSpoolColumns(t: SpoolColumnsTranslator, tc: CodesTranslator): ReadonlyArray<DataColumn<SpoolStatus>> {
  return [
  {
    id: "spoolNumber",
    header: t("spool"),
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
    header: t("iso"),
    value: (spool) => spool.isoNumber,
    searchable: true,
    filter: "text",
    className: "font-mono text-xs",
  },
  {
    id: "currentStage",
    header: t("stage"),
    value: (spool) => tc(`fabricationStage.${spool.currentStage ?? "not_started"}`),
    filter: "select",
    // Status can be empty. Its useful filter is server-side, while a null-safe keyset sort would
    // need a separate cursor shape, so do not pretend that the current cursor can sort it.
    sortable: false,
    cell: (spool) => (
      <StatusBadge
        status={spool.currentStage ?? "not_started"}
        label={tc(`fabricationStage.${spool.currentStage ?? "not_started"}`)}
      />
    ),
  },
  {
    id: "material",
    header: t("material"),
    numeric: true,
    value: (spool) => ratio(spool.lineChecked, spool.lineTotal),
    sortable: false,
    cell: (spool) => `${spool.lineChecked}/${spool.lineTotal}`,
  },
  {
    id: "welds",
    header: t("welds"),
    numeric: true,
    value: (spool) => ratio(spool.weldComplete, spool.weldTotal),
    sortable: false,
    cell: (spool) => `${spool.weldComplete}/${spool.weldTotal}`,
  },
  {
    id: "supports",
    header: t("supports"),
    numeric: true,
    value: (spool) => ratio(spool.supportRecorded, spool.supportTotal),
    sortable: false,
    cell: (spool) => `${spool.supportRecorded}/${spool.supportTotal}`,
  },
  { id: "ndePending", header: t("ndeOpen"), numeric: true, value: (spool) => spool.ndePending, filter: "number" },
  { id: "pwhtPending", header: t("pwhtOpen"), numeric: true, value: (spool) => spool.pwhtPending, filter: "number" },
  {
    id: "isReleasable",
    header: t("releasable"),
    value: (spool) => spool.isReleasable,
    filter: "boolean",
    cell: (spool) =>
      spool.isReleasable ? <StatusBadge status="ready" label={t("releasable")} /> : null,
  },
  ]
}
