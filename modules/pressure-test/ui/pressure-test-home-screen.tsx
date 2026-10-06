"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  listBlindingWorklist,
  listItemClearanceWorklist,
  listLineCheckWorklist,
  listReinstatementWorklist,
  listTestingPrecommWorklist,
} from "../infrastructure/supabase-pressure-test-repository"
import { buildTestPackHref } from "./test-pack-workspace-model"

const stages = [
  ["Line Check", "/testpack/pressure-test/line-check", "line"],
  ["Item Clearance", "/testpack/pressure-test/item-clearance", "clearance"],
  ["Blinding", "/testpack/pressure-test/blinding", "blinding"],
  ["Testing / Pre-commissioning", "/testpack/pressure-test/testing-precomm", "testing"],
  ["Reinstatement", "/testpack/pressure-test/reinstatement", "reinstatement"],
] as const

export function PressureTestHomeScreen() {
  const searchParams = useSearchParams()
  const testPackId = searchParams.get("testPackId")
  const auth = useSupabaseAuth()
  const projectId = auth.access?.projectId
  const projectCode = auth.access?.activityCode

  const withPack = (href: string) =>
    buildTestPackHref({ href, projectCode, testPackId })

  const [counts, setCounts] = useState<Record<string, [number, number]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    let active = true
    setLoading(true)
    setError(null)
    const client = getSupabaseBrowserClient()
    const scopedPackId = testPackId ?? undefined

    void Promise.all([
      listLineCheckWorklist(client, projectId, scopedPackId),
      listItemClearanceWorklist(client, projectId, scopedPackId),
      listBlindingWorklist(client, projectId, scopedPackId),
      listTestingPrecommWorklist(client, projectId, scopedPackId),
      listReinstatementWorklist(client, projectId, scopedPackId),
    ])
      .then(([line, clearance, blinding, testing, reinstatement]) => {
        if (!active) return
        setCounts({
          line: [line.filter((row) => row.result_id === null).length, line.length],
          clearance: [clearance.filter((row) => row.clearance_id === null).length, clearance.length],
          blinding: [blinding.filter((row) => row.record_id === null).length, blinding.length],
          testing: [
            testing.filter((row) => row.precommissioning_completed_on === null).length,
            testing.length,
          ],
          reinstatement: [
            reinstatement.filter((row) => row.record_id === null).length,
            reinstatement.length,
          ],
        })
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Failed to load workflow counts")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, testPackId])

  if (!projectId) return <p className="text-sm text-muted-foreground">Select a project to view Pressure Test.</p>
  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pressure Test</h1>
        <p className="text-sm text-muted-foreground">
          Canonical order: RFT → Blinding → Testing → Y reinstatement → Pre-commissioning → Z reinstatement. Open X punches route through Item Clearance.
          {testPackId && " Filtered for selected Test Pack."}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map(([title, href, key]) => (
          <Link key={href} href={withPack(href)}>
            <Card className="h-full hover:bg-muted transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {counts[key]?.[0] ?? 0} open · {counts[key]?.[1] ?? 0} total
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
