"use client"

import { useTestPackTranslations, reportTestPackError } from "@/modules/pressure-test/ui/test-pack-i18n"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { listRequestDetails, type RequestDetailsRow } from "../infrastructure/supabase-pressure-test-repository"

export function RequestPrintView({ title, requestId, expectedType }: { title: string; requestId: string; expectedType: "line_check" | "item_clearance" | "blinding" | "reinstatement" }) {
  const t = useTestPackTranslations()

  const projectId = useSupabaseAuth().access?.projectId; const [request, setRequest] = useState<RequestDetailsRow | null>(null); const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!projectId) return; let active = true; void listRequestDetails(getSupabaseBrowserClient(), projectId, requestId).then((row) => { if (!active) return; if (!row || row.request_type !== expectedType) setError(t("text.requestNotFoundInThisProjectOrRequest")); else setRequest(row) }).catch((cause) => { if (active) setError(reportTestPackError(cause, t("text.couldNotLoadRequest"))) }); return () => { active = false } }, [projectId, requestId, expectedType])
  if (error) return <main className="space-y-4 p-8"><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm text-destructive">{error}</p><Link className="underline" href="/testpack/pressure-test">{t("text.backToPressureTest")}</Link></main>
  if (!request) return <main className="space-y-4 p-8"><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">{t("text.loadingDurableRequest")}</p></main>
  const requestTypeKey = {
    line_check: "text.lineCheck",
    item_clearance: "text.itemClearance",
    blinding: "text.blinding",
    reinstatement: "text.reinstatement",
  } as const
  const requestType =
    request.request_type === "line_check" ||
    request.request_type === "item_clearance" ||
    request.request_type === "blinding" ||
    request.request_type === "reinstatement"
      ? request.request_type
      : expectedType
  const targetCount = request.line_check_iso_count ?? request.clearance_item_count ?? 0

  return <main className="space-y-6 p-8 print:p-0"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">{t("text.pipeqcPressureTestRequest")}</p></div><Button type="button" className="print:hidden" onClick={() => window.print()}>{t("text.print")}</Button></div><div className="grid gap-3 rounded border p-4 text-sm sm:grid-cols-2"><span>{t("text.requestNumber")} <strong>{request.request_number}</strong></span><span>{t("text.requestType")} {t(requestTypeKey[requestType])}</span><span>{t("text.testPack93")} {request.test_pack_id}</span><span>{t("text.revision")} {request.test_pack_revision_no}</span><span>{t("text.team95")} {request.team_code} · {request.team_description}</span><span>{t("text.assignedOn")} {request.assigned_on}</span><span>{t("text.targets", { count: targetCount })}</span></div><p className="text-xs text-muted-foreground">{t("text.requestId")} {request.id}</p><Link className="underline print:hidden" href="/testpack/pressure-test">{t("text.backToPressureTest")}</Link></main>
}
