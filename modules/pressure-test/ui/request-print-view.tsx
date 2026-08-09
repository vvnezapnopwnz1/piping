"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { listRequestDetails, type RequestDetailsRow } from "../infrastructure/supabase-pressure-test-repository"

export function RequestPrintView({ title, requestId, expectedType }: { title: string; requestId: string; expectedType: "line_check" | "item_clearance" | "blinding" | "reinstatement" }) {
  const projectId = useSupabaseAuth().access?.projectId; const [request, setRequest] = useState<RequestDetailsRow | null>(null); const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!projectId) return; let active = true; void listRequestDetails(getSupabaseBrowserClient(), projectId, requestId).then((row) => { if (!active) return; if (!row || row.request_type !== expectedType) setError("Request not found in this project or request type does not match this form."); else setRequest(row) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load request") }); return () => { active = false } }, [projectId, requestId, expectedType])
  if (error) return <main className="space-y-4 p-8"><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm text-destructive">{error}</p><Link className="underline" href="/testpack/pressure-test">Back to Pressure Test</Link></main>
  if (!request) return <main className="space-y-4 p-8"><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">Loading durable request…</p></main>
  return <main className="space-y-6 p-8 print:p-0"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm text-muted-foreground">PipeQC pressure-test request</p></div><Button type="button" className="print:hidden" onClick={() => window.print()}>Print</Button></div><div className="grid gap-3 rounded border p-4 text-sm sm:grid-cols-2"><span>Request number: <strong>{request.request_number}</strong></span><span>Request type: {request.request_type}</span><span>Test Pack: {request.test_pack_id}</span><span>Revision: {request.test_pack_revision_no}</span><span>Team: {request.team_code} · {request.team_description}</span><span>Assigned on: {request.assigned_on}</span><span>Targets: {request.line_check_iso_count ?? request.clearance_item_count ?? "—"}</span></div><p className="text-xs text-muted-foreground">Request ID: {request.id}</p><Link className="underline print:hidden" href="/testpack/pressure-test">Back to Pressure Test</Link></main>
}
