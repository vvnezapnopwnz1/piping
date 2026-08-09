"use client"

import * as React from "react"
import Link from "next/link"
import { RefreshCw, Users } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { createLatestProjectLoader } from "../application/manage-tracking"
import type { TrackingDeviceManagementRow } from "../domain/tracking"
import { loadTrackingDeviceManagement } from "../infrastructure/supabase-tracking-repository"

export function TrackingDeviceScreen({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const loader = React.useRef(createLatestProjectLoader<TrackingDeviceManagementRow[]>())
  const [result, setResult] = React.useState<{ projectId: string; rows: TrackingDeviceManagementRow[] } | null>(null)
  const [errorProjectId, setErrorProjectId] = React.useState<string | null>(null)
  const [refreshToken, setRefreshToken] = React.useState(0)
  React.useEffect(() => {
    const requestLoader = loader.current
    void requestLoader.run(projectId, () => loadTrackingDeviceManagement(getSupabaseBrowserClient(), projectId), (rows) => { setResult({ projectId, rows }); setErrorProjectId(null) }).catch(() => setErrorProjectId(projectId))
    return () => requestLoader.invalidate()
  }, [projectId, refreshToken])
  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>Unable to load mobile device usage</AlertTitle><AlertDescription>Check project access and retry.</AlertDescription></Alert>
  if (!result || result.projectId !== projectId) return <p className="p-6 text-sm text-muted-foreground">Loading mobile device usage…</p>
  const rows = result.rows
  return <div className="space-y-6 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Mobile Device Management</h1><p className="text-sm text-muted-foreground">Recorded use and assignment entry points for project PDA devices.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setRefreshToken((value) => value + 1)}><RefreshCw />Refresh</Button>{canManage && <Button asChild><Link href="/admin/project-referential"><Users />Edit users</Link></Button>}</div></div><Card><CardHeader><CardTitle>Device usage</CardTitle><CardDescription>Counts, operator and location are derived from effective tracking events. Battery and connectivity are not collected.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Device</TableHead><TableHead>Scans</TableHead><TableHead>Most frequent operator</TableHead><TableHead>Most frequent location</TableHead><TableHead>Last use</TableHead><TableHead>Assignment</TableHead></TableRow></TableHeader><TableBody>{rows.length === 0 ? <TableRow><TableCell colSpan={6}>No project devices are configured. Use Edit users to manage project devices and assignments.</TableCell></TableRow> : rows.map((row) => <TableRow key={row.deviceId}><TableCell>{row.deviceCode}</TableCell><TableCell>{row.scanCount}</TableCell><TableCell>{row.mostFrequentOperatorMembershipId ?? "No recorded usage"}</TableCell><TableCell>{row.mostFrequentLocationCode ?? "No recorded usage"}</TableCell><TableCell>{row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "Never"}</TableCell><TableCell>{row.assignedMembershipId ? `Assigned · ${row.assignedMembershipId}` : "Unassigned"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>
}
