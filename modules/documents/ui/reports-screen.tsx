"use client"

import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createRequestVersion } from "@/lib/request-version"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  generateDemoReport,
  type GenerateDemoReportInput,
  type GenerateDemoReportResult,
} from "../application/generate-demo-report"
import { REPORT_DEFINITIONS, type ReportCode } from "../domain/report"
import {
  loadFabricationProgressSnapshot,
  loadTestPackRftSnapshot,
} from "../infrastructure/supabase-report-repository"

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function ReportsScreen({
  projectId,
  projectCode,
}: {
  projectId: string
  projectCode: string
}) {
  const t = useTranslations("documents")
  const [pendingCode, setPendingCode] = useState<ReportCode | null>(null)
  const [error, setError] = useState<{ code: ReportCode; failure: Extract<GenerateDemoReportResult, { ok: false }> } | null>(null)
  const [lastDownloaded, setLastDownloaded] = useState<ReportCode | null>(null)
  const requestVersion = useRef(createRequestVersion())

  useEffect(() => {
    const version = requestVersion.current
    return () => version.invalidate()
  }, [])

  const generate = async (code: ReportCode) => {
    const token = requestVersion.current.start()
    setPendingCode(code)
    setError(null)
    setLastDownloaded(null)

    const client = getSupabaseBrowserClient()
    const input: GenerateDemoReportInput = {
      code,
      projectId,
      projectCode,
      generatedAt: new Date(),
    }
    const result = await generateDemoReport({
      loadFabricationProgress: (request) => loadFabricationProgressSnapshot(client, request),
      loadTestPackRft: (request) => loadTestPackRftSnapshot(client, request),
    }, input)

    if (!token.isCurrent()) return
    setPendingCode(null)
    if (!result.ok) {
      setError({ code, failure: result })
      return
    }

    downloadBlob(result.value.blob, result.value.fileName)
    setLastDownloaded(code)
  }

  const describeReportFailure = (failure: Extract<GenerateDemoReportResult, { ok: false }>) =>
    failure.reason === "unknownReport"
      ? t("error.unknownReport")
      : failure.detail === undefined
        ? t("error.failedNoDetail")
        : t("error.failed", { detail: failure.detail })

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORT_DEFINITIONS.map((report) => {
          const pending = pendingCode === report.code
          const reportError = error?.code === report.code ? error.failure : null
          return (
            <Card key={report.code}>
              <CardHeader>
                <CardTitle>{t(`reports.${report.code}.title`)}</CardTitle>
                <CardDescription>{t(`reports.${report.code}.description`)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{report.code} · {report.outputFormat.toUpperCase()}</p>
                {reportError ? <p className="text-sm text-destructive">{describeReportFailure(reportError)}</p> : null}
                {lastDownloaded === report.code ? <p className="text-success-fg text-sm">{t("downloaded")}</p> : null}
                <Button
                  type="button"
                  onClick={() => void generate(report.code)}
                  loading={pending}
                  disabled={pendingCode !== null}
                >
                  {pending ? null : <Download className="mr-2 size-4" />}
                  {t("download", { format: report.outputFormat.toUpperCase() })}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("note")}
      </p>
    </div>
  )
}
