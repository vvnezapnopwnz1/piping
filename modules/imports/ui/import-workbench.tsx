"use client"

import { useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  IMPORT_TYPES,
  type ImportType,
} from "../domain/import-type"
import type { ImportRowIssue } from "../domain/import-issue"
import type { ParsedRow } from "../domain/parsers/registry"
import { toStoredIssues, validateSheet } from "../application/create-import"
import { describeApplyGate } from "../application/apply-import"
import {
  buildTemplateWorkbook,
  readFirstSheetMatrix,
  computeChecksum,
} from "../infrastructure/xlsx-workbook"
import {
  createImportJob,
  uploadImportFile,
  markImportJobUploaded,
  recordImportValidation,
  applyImportJob,
  importObjectPath,
} from "../infrastructure/supabase-import-repository"
import { describeApplyReason } from "./apply-reason-text"
import { importTypeLabel } from "./import-issue-text"
import { ImportIssueList } from "./import-issue-list"
import { ImportConflictDialog } from "./import-conflict-dialog"

type Stage = "idle" | "validated" | "applied"

export function ImportWorkbench({
  projectId,
  canManage,
  onApplied,
}: {
  projectId: string
  canManage: boolean
  onApplied: () => void
}) {
  const t = useTranslations("spooling")
  const [importType, setImportType] = useState<ImportType>("piping_material_list")
  const [jobId, setJobId] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [issues, setIssues] = useState<ImportRowIssue[]>([])
  const [stage, setStage] = useState<Stage>("idle")
  const [busy, setBusy] = useState(false)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)

  const summary = useMemo(() => {
    let blockerCount = 0
    let conflictCount = 0
    for (const issue of issues) {
      if (issue.severity === "blocker") blockerCount += 1
      else if (issue.severity === "conflict") conflictCount += 1
    }
    return { blockerCount, conflictCount }
  }, [issues])

  const gate = useMemo(
    () =>
      describeApplyGate({
        status: stage === "validated" ? "validated" : stage === "applied" ? "applied" : "draft",
        blockerCount: summary.blockerCount,
        conflictCount: summary.conflictCount,
        conflictsConfirmed: false,
      }),
    [stage, summary]
  )

  const downloadTemplate = useCallback(() => {
    const bytes = buildTemplateWorkbook(importType)
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${importType}-template.xlsx`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [importType])

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true)
      try {
        const client = getSupabaseBrowserClient()
        const buffer = await file.arrayBuffer()
        const checksum = await computeChecksum(buffer)
        const matrix = readFirstSheetMatrix(buffer)
        const outcome = validateSheet(importType, matrix)

        const job = await createImportJob(client, {
          projectId,
          importType,
          fileName: file.name,
          mediaType: file.type,
          sizeBytes: file.size,
          checksum,
        })

        const objectPath = importObjectPath(projectId, job.id, file.name)
        await uploadImportFile(client, objectPath, file)
        await markImportJobUploaded(client, job.id, objectPath)
        await recordImportValidation(client, job.id, outcome.rows, toStoredIssues(outcome.issues))

        setJobId(job.id)
        setRows(outcome.rows)
        setIssues(outcome.issues)
        setStage("validated")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("workbench.fileFailed"))
      } finally {
        setBusy(false)
      }
    },
    [importType, projectId, t]
  )

  const runApply = useCallback(
    async (confirmConflicts: boolean) => {
      if (!jobId) return
      setBusy(true)
      try {
        const client = getSupabaseBrowserClient()
        const applied = await applyImportJob(client, jobId, confirmConflicts, importType)
        setStage("applied")
        toast.success(t("workbench.applied", { count: applied.appliedRowCount }))
        onApplied()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("workbench.applyFailed"))
      } finally {
        setBusy(false)
        setConflictDialogOpen(false)
      }
    },
    [importType, jobId, onApplied, t]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workbench.title", { type: importTypeLabel(t, importType) })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={importType}
            onValueChange={(next) => {
              setImportType(next as ImportType)
              setStage("idle")
              setRows([])
              setIssues([])
              setJobId(null)
            }}
          >
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMPORT_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {importTypeLabel(t, value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={downloadTemplate}>
            {t("workbench.downloadTemplate")}
          </Button>

          <input
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            disabled={!canManage || busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ""
            }}
          />
        </div>

        {importType === "test_pack_composition" && (
          <p role="status" className="text-warning-fg text-sm">
            {t("workbench.testPackNote")}
          </p>
        )}

        {stage !== "idle" && (
          <div className="space-y-3">
            <p className="text-sm">
              {t("workbench.summary", { rows: rows.length, errors: summary.blockerCount, overwrites: summary.conflictCount })}
            </p>

            <ImportIssueList issues={issues} />

            <div className="flex items-center gap-3">
              <Button
                disabled={!canManage || busy || stage === "applied" || summary.blockerCount > 0}
                onClick={() => {
                  if (summary.conflictCount > 0) {
                    setConflictDialogOpen(true)
                    return
                  }
                  void runApply(false)
                }}
              >
                {t("workbench.apply")}
              </Button>
              {gate.reason && (
                <span className="text-sm text-muted-foreground">{describeApplyReason(t, gate.reason)}</span>
              )}
            </div>
          </div>
        )}

        <ImportConflictDialog
          open={conflictDialogOpen}
          conflictCount={summary.conflictCount}
          onCancel={() => setConflictDialogOpen(false)}
          onConfirm={() => void runApply(true)}
        />
      </CardContent>
    </Card>
  )
}
