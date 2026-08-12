"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { listBlindingWorklist, listItemClearanceWorklist, listLineCheckWorklist, listReinstatementWorklist, listTestingPrecommWorklist, listTestPackReadiness, type TestPackReadinessRow } from "../infrastructure/supabase-pressure-test-repository"

type DashboardRow = { label: string; ready: number; ongoing: number; total: number; href: string }

export function TestPackDashboard({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<TestPackReadinessRow[]>([])
  const [counts, setCounts] = useState({ line: 0, lineTotal: 0, clearance: 0, clearanceTotal: 0, blinding: 0, blindingTotal: 0, testing: 0, testingTotal: 0, reinstatement: 0, reinstatementTotal: 0 })
  const [filter, setFilter] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setRows([])
    setCounts({ line: 0, lineTotal: 0, clearance: 0, clearanceTotal: 0, blinding: 0, blindingTotal: 0, testing: 0, testingTotal: 0, reinstatement: 0, reinstatementTotal: 0 })
    setError(null)
    setLoading(true)
    const client = getSupabaseBrowserClient()
    void Promise.all([listTestPackReadiness(client, projectId), listLineCheckWorklist(client, projectId), listItemClearanceWorklist(client, projectId), listBlindingWorklist(client, projectId), listTestingPrecommWorklist(client, projectId), listReinstatementWorklist(client, projectId)]).then(([packs, line, clearance, blinding, testing, reinstatement]) => {
      if (!active) return
      setRows(packs)
      setCounts({
        line: line.filter((item) => item.result_id !== null).length, lineTotal: line.length,
        clearance: clearance.filter((item) => item.clearance_id !== null).length, clearanceTotal: clearance.length,
        blinding: blinding.filter((item) => item.record_id !== null).length, blindingTotal: blinding.length,
        testing: testing.filter((item) => item.testing_completed_on !== null).length, testingTotal: testing.length,
        reinstatement: reinstatement.filter((item) => item.record_id !== null).length, reinstatementTotal: reinstatement.length,
      })
      setError(null)
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load Test Packs") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId])

  const visibleRows = useMemo(() => rows.filter((row) => (row.test_pack_number ?? "").toLowerCase().includes(filter.toLowerCase())), [filter, rows])
  const stages: DashboardRow[] = [
    { label: "Line Check", ready: counts.line, ongoing: counts.lineTotal - counts.line, total: counts.lineTotal, href: "/testpack/pressure-test/line-check/progress" },
    { label: "Item Clearance", ready: counts.clearance, ongoing: counts.clearanceTotal - counts.clearance, total: counts.clearanceTotal, href: "/testpack/pressure-test/item-clearance/progress" },
    { label: "Blinding", ready: counts.blinding, ongoing: counts.blindingTotal - counts.blinding, total: counts.blindingTotal, href: "/testpack/pressure-test/blinding/progress" },
    { label: "Testing", ready: counts.testing, ongoing: counts.testingTotal - counts.testing, total: counts.testingTotal, href: "/testpack/pressure-test/testing-precomm/progress" },
    { label: "Reinstatement", ready: counts.reinstatement, ongoing: counts.reinstatementTotal - counts.reinstatement, total: counts.reinstatementTotal, href: "/testpack/pressure-test/reinstatement/progress" },
  ]

  if (error) return <p className="text-sm text-destructive">{error}</p>
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Test Packs</h1><p className="text-sm text-muted-foreground">Database-backed release tracking and pressure-test workflow.</p></div><div className="flex gap-3 text-sm"><Link className="underline" href="/testpack/builder">Builder</Link><Link className="underline" href="/testpack/explorer">Explorer</Link></div></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-sm">Ready for Test</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{loading ? "…" : rows.filter((row) => row.isRft).length}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Ongoing / blocked</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{loading ? "…" : rows.filter((row) => !row.isRft).length}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Visible packs</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{loading ? "…" : rows.length}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Workflow by stage</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-5">{stages.map((stage) => <Link key={stage.label} href={stage.href} className="rounded border p-3 hover:bg-muted"><div className="text-sm font-medium">{stage.label}</div><div className="mt-2 text-xs text-muted-foreground">Ready {stage.ready} · Ongoing {stage.ongoing}</div><div className="mt-1 text-xs text-muted-foreground">{stage.total} targets</div></Link>)}</CardContent></Card>
    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Release backlog</CardTitle><input aria-label="Filter Test Packs" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter number" className="h-9 rounded border bg-transparent px-3 text-sm" /></CardHeader><CardContent className="space-y-2">{visibleRows.map((row) => <Link key={row.testPackId} href={`/testpack/explorer?testPackId=${row.testPackId}`} className="flex justify-between rounded border p-3 text-sm hover:bg-muted"><span>{row.test_pack_number} <span className="text-muted-foreground">rev {row.revision_no} · {row.member_count ?? 0} ISO</span></span><span>{row.isRft ? "RFT · 12" : `Blocked · X ${row.x_open_count ?? 0}`}</span></Link>)}{!loading && visibleRows.length === 0 && <p className="text-sm text-muted-foreground">No Test Packs are visible in this project scope.</p>}</CardContent></Card>
  </div>
}
