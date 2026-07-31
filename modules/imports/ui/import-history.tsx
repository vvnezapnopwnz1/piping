"use client"

import { useCallback, useEffect, useState } from "react"
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
import { getImportTypeDefinition, type ImportType } from "../domain/import-type"
import type { ImportJob } from "../domain/import-job"
import { isTerminalStatus } from "../domain/import-job"
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
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const client = getSupabaseBrowserClient()
      setJobs(await loadImportHistory(client, projectId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "History could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload, refreshToken])

  const download = useCallback(async (job: ImportJob) => {
    if (!job.storagePath) return
    const client = getSupabaseBrowserClient()
    const url = await getImportFileSignedUrl(client, job.storagePath)
    if (!url) {
      toast.error("The source file is no longer available.")
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }, [])

  const cancel = useCallback(
    async (job: ImportJob) => {
      try {
        const client = getSupabaseBrowserClient()
        await cancelImportJob(client, job.id)
        await reload()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The import could not be cancelled.")
      }
    },
    [reload]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import history</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No imports have been run for this project.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows applied</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    {getImportTypeDefinition(job.importType as ImportType).label}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{job.sourceFileName}</TableCell>
                  <TableCell>
                    <Badge variant={job.status === "applied" ? "default" : "outline"}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.appliedRowCount}</TableCell>
                  <TableCell className="text-xs">{job.createdAt}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => void download(job)}>
                      Download source
                    </Button>
                    {canManage && !isTerminalStatus(job.status) && (
                      <Button size="sm" variant="ghost" onClick={() => void cancel(job)}>
                        Cancel
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
