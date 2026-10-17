"use client"

import { useTranslations } from "next-intl"
import { useMemo } from "react"

import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { codeLabel } from "@/i18n/translator"
import { jointState, jointStatusMessage } from "../../domain/nde-joint-state"
import type { NdeObligation } from "../../domain/nde-batch"

/** Every joint of the project with its NDE state, searchable by joint, spool and batch. */
export function JointsTab({ obligations, loading }: { obligations: readonly NdeObligation[]; loading: boolean }) {
  const t = useTranslations("nde.screen")
  const tb = useTranslations("nde.batch")
  const tc = useTranslations("codes")
  const [table, setTable] = useTableUrlState({ namespace: "nx" })
  const columns = useMemo<DataColumn<NdeObligation>[]>(() => [
    { id: "weld", header: t("column.joint"), value: (ob) => ob.weldNumber, searchable: true, filter: "text", pinned: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "spool", header: t("column.spool"), value: (ob) => ob.spoolNumber, searchable: true, filter: "text", className: "font-mono" },
    { id: "batch", header: t("column.batch"), value: (ob) => ob.batchNumber ?? "—", searchable: true, filter: "select", className: "font-mono" },
    { id: "method", header: t("column.method"), value: (ob) => codeLabel(tc, "ndeMethod", ob.method), filter: "select" },
    { id: "state", header: t("column.state"), value: (ob) => t(`state.${jointState(ob)}`), filter: "select" },
    { id: "status", header: t("column.status"), value: (ob) => { const message = jointStatusMessage(ob); return tb(message.key as never, message.values as never) }, filter: "select" },
    { id: "coverage", header: t("column.coverage"), numeric: true, value: (ob) => `${ob.requiredCoverage} %` },
  ], [t, tb, tc])
  return (
    <DataTable
      columns={columns}
      rows={[...obligations]}
      state={table}
      onStateChange={setTable}
      rowId={(ob) => ob.id}
      loading={loading}
      searchPlaceholder={t("searchPlaceholder")}
      emptyTitle={t("emptyTitle")}
      emptyDescription={t("emptyDescription")}
    />
  )
}
