"use client"

import { useLocale, useTranslations } from "next-intl"
import { formatMoment } from "@/i18n/format"
import * as React from "react"
import Link from "next/link"
import { RefreshCw, Users } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { createLatestProjectLoader } from "../application/manage-tracking"
import type { TrackingDeviceManagementRow } from "../domain/tracking"
import { loadTrackingDeviceManagement } from "../infrastructure/supabase-tracking-repository"

export function TrackingDeviceScreen({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const locale = useLocale()
  const t = useTranslations("tracking")
  const loader = React.useRef(createLatestProjectLoader<TrackingDeviceManagementRow[]>())
  const [result, setResult] = React.useState<{ projectId: string; rows: TrackingDeviceManagementRow[] } | null>(null)
  const [errorProjectId, setErrorProjectId] = React.useState<string | null>(null)
  const [refreshToken, setRefreshToken] = React.useState(0)
  React.useEffect(() => {
    const requestLoader = loader.current
    void requestLoader.run(projectId, () => loadTrackingDeviceManagement(getSupabaseBrowserClient(), projectId), (rows) => { setResult({ projectId, rows }); setErrorProjectId(null) }).catch(() => setErrorProjectId(projectId))
    return () => requestLoader.invalidate()
  }, [projectId, refreshToken])
  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>{t("devices.loadError")}</AlertTitle><AlertDescription>{t("devices.loadErrorDescription")}</AlertDescription></Alert>
  if (!result || result.projectId !== projectId) return <Skeleton className="h-64 w-full" />
  const rows = result.rows
  return <div className="space-y-6 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{t("devices.title")}</h1><p className="text-sm text-muted-foreground">{t("devices.description")}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setRefreshToken((value) => value + 1)}><RefreshCw />{t("actions.refresh")}</Button>{canManage && <Button asChild><Link href="/admin/project-referential"><Users />{t("actions.editUsers")}</Link></Button>}</div></div><Card><CardHeader><CardTitle>{t("devices.cardTitle")}</CardTitle><CardDescription>{t("devices.cardDescription")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("devices.table.device")}</TableHead><TableHead>{t("devices.table.scans")}</TableHead><TableHead>{t("devices.table.mostFrequentOperator")}</TableHead><TableHead>{t("devices.table.mostFrequentLocation")}</TableHead><TableHead>{t("devices.table.lastUse")}</TableHead><TableHead>{t("devices.table.assignment")}</TableHead></TableRow></TableHeader><TableBody>{rows.length === 0 ? <TableRow><TableCell colSpan={6}>{t("devices.table.empty")}</TableCell></TableRow> : rows.map((row) => <TableRow key={row.deviceId}><TableCell>{row.deviceCode}</TableCell><TableCell>{row.scanCount}</TableCell><TableCell>{row.mostFrequentOperatorMembershipId ?? t("noRecordedUsage")}</TableCell><TableCell>{row.mostFrequentLocationCode ?? t("noRecordedUsage")}</TableCell><TableCell>{row.lastUsedAt ? formatMoment(row.lastUsedAt, locale) : t("never")}</TableCell><TableCell>{row.assignedMembershipId ? t("assigned", { id: row.assignedMembershipId }) : t("unassigned")}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>
}
