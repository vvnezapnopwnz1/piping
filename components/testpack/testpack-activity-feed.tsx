"use client"

import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { ClipboardCheck, ListChecks, Shield, RotateCcw } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTestpackStore } from "@/store/testpack-store"

interface FeedEntry {
  id: string
  icon: typeof ClipboardCheck
  iconClass: string
  text: string
  at: string
}

export function TestpackActivityFeed() {
  const checkingRequests = useTestpackStore((s) => s.checkingRequests)
  const clearanceRequests = useTestpackStore((s) => s.clearanceRequests)
  const blindingRequests = useTestpackStore((s) => s.blindingRequests)
  const reinstatementRequests = useTestpackStore((s) => s.reinstatementRequests)

  const entries: FeedEntry[] = useMemo(() => {
    const a: FeedEntry[] = []
    checkingRequests.forEach((r) =>
      a.push({
        id: r.id,
        icon: ClipboardCheck,
        iconClass: "bg-sky-100 text-sky-600",
        text: `Line check ${r.id} → ${r.assignedTo} · ${r.isoIds.length} ISO(s)`,
        at: r.createdAt,
      }),
    )
    clearanceRequests.forEach((r) =>
      a.push({
        id: r.id,
        icon: ListChecks,
        iconClass: "bg-amber-100 text-amber-600",
        text: `Item clearance ${r.id} → ${r.assignedTo} · ${r.punchItemIds.length} item(s)`,
        at: r.createdAt,
      }),
    )
    blindingRequests.forEach((r) =>
      a.push({
        id: r.id,
        icon: Shield,
        iconClass: "bg-violet-100 text-violet-600",
        text: `Blinding ${r.id} → ${r.assignedTo} · ${r.testpackIds.length} TP(s)`,
        at: r.createdAt,
      }),
    )
    reinstatementRequests.forEach((r) =>
      a.push({
        id: r.id,
        icon: RotateCcw,
        iconClass: "bg-emerald-100 text-emerald-600",
        text: `Reinstatement ${r.id} → ${r.assignedTo} · ${r.punchItemIds.length} joint(s)`,
        at: r.createdAt,
      }),
    )
    return a
      .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
      .slice(0, 12)
  }, [
    checkingRequests,
    clearanceRequests,
    blindingRequests,
    reinstatementRequests,
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
        <CardDescription>
          Live feed of dispatch actions across the test pack workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No recent activity
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => {
              const Icon = e.icon
              return (
                <li key={e.id} className="flex items-start gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${e.iconClass}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 text-sm">
                    <p className="text-slate-800">{e.text}</p>
                    <p className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
