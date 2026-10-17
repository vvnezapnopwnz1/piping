"use client"

import { useTranslations } from "next-intl"

import { codeLabel } from "@/i18n/translator"
import type { NdeBatch, NdeObligation } from "../../domain/nde-batch"

export function ClosedTab({ batches, obligations }: { batches: readonly NdeBatch[]; obligations: readonly NdeObligation[] }) {
  const t = useTranslations("nde.screen")
  const tb = useTranslations("nde.batch")
  const tc = useTranslations("codes")
  const closed = batches.filter((batch) => batch.status === "closed" || batch.status === "returned")
  const counts = new Map<string, number>()
  for (const ob of obligations) if (ob.batchNumber) counts.set(ob.batchNumber, (counts.get(ob.batchNumber) ?? 0) + 1)
  if (closed.length === 0) return <p className="text-sm text-muted-foreground">{t("noClosed")}</p>
  return (
    <ul className="space-y-1 text-sm">
      {closed.map((batch) => (
        <li key={batch.id} className="flex flex-wrap justify-between gap-2 rounded border px-3 py-2">
          <span className="font-mono font-medium">{batch.batchNumber}</span>
          <span className="text-muted-foreground">
            {codeLabel(tc, "ndeMethod", batch.method)} · {tb(`coverageRegimeSummary.${batch.coverageRegime}`)} · {t("closedBatch", { count: counts.get(batch.batchNumber) ?? 0 })} · {batch.closedOn ?? batch.issuedOn ?? ""}
          </span>
        </li>
      ))}
    </ul>
  )
}
