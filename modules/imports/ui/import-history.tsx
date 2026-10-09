"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { ImportJob } from "../domain/import-job"
import { isTerminalStatus } from "../domain/import-job"
import { importTypeLabel } from "./import-issue-text"
import {
  loadImportHistory,
  getImportFileSignedUrl,
  cancelImportJob,
} from "../infrastructure/supabase-import-repository"

export function ImportHistory({
  projectId,
  canManage,
  refreshToken,
}: {
  projectId: string
  canManage: boolean
  refreshToken: number
}) {
  const t = useTranslations("spooling")
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const client = getSupabaseBrowserClient()
      setJobs(await loadImportHistory(client, projectId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("history.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

  useEffect(() => {
    void reload()
  }, [reload, refreshToken])

  const download = useCallback(async (job: ImportJob) => {
    if (!job.storagePath) return
    const client = getSupabaseBrowserClient()
    const url = await getImportFileSignedUrl(client, job.storagePath)
    if (!url) {
      toast.error(t("history.sourceGone"))
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }, [t])

  const cancel = useCallback(
    async (job: ImportJob) => {
      try {
        const client = getSupabaseBrowserClient()
        await cancelImportJob(client, job.id)
        await reload()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("history.cancelFailed"))
      }
    },
    [reload, t]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("history.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("history.loading")}</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("history.type")}</TableHead>
                <TableHead>{t("history.file")}</TableHead>
                <TableHead>{t("history.status")}</TableHead>
                <TableHead>{t("history.rowsApplied")}</TableHead>
                <TableHead>{t("history.created")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    {importTypeLabel(t, job.importType)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{job.sourceFileName}</TableCell>
                  <TableCell>
                    <Badge variant={job.status === "applied" ? "default" : "outline"}>
                      {t(`history.statuses.${job.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.appliedRowCount}</TableCell>
                  <TableCell className="text-xs">{job.createdAt}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => void download(job)}>
                      {t("history.download")}
                    </Button>
                    {canManage && !isTerminalStatus(job.status) && (
                      <Button size="sm" variant="ghost" onClick={() => void cancel(job)}>
                        {t("history.cancel")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
