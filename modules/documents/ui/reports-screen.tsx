"use client"

import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { downloadBlob } from "@/lib/download-blob"
import { createRequestVersion } from "@/lib/request-version"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { generateDocument, type GenerateDocumentResult } from "../application/generate-document"
import { DOCUMENT_DEFINITIONS, type DocumentCode, type DocumentFormat } from "../domain/report"
import { loadPdfFonts } from "../infrastructure/renderers/pdf-document"
import {
  loadNdeRegister,
  loadPunchRegister,
  loadTestPackSummary,
  loadWeldLog,
} from "../infrastructure/supabase-report-repository"
import { useDocumentLabels } from "./document-labels"

const PROJECT_DOCUMENTS = DOCUMENT_DEFINITIONS.filter((definition) => definition.scope === "project")

export function ReportsScreen({
  projectId,
  projectCode,
  projectTitle,
  author,
}: {
  projectId: string
  projectCode: string
  projectTitle: string
  author: string
}) {
  const t = useTranslations("documents")
  const { locale, chrome, labels } = useDocumentLabels()
  const [pending, setPending] = useState<{ code: DocumentCode; format: DocumentFormat } | null>(null)
  const [error, setError] = useState<{ code: DocumentCode; failure: Extract<GenerateDocumentResult, { ok: false }> } | null>(null)
  const [lastDownloaded, setLastDownloaded] = useState<DocumentCode | null>(null)
  const requestVersion = useRef(createRequestVersion())

  useEffect(() => {
    const version = requestVersion.current
    return () => version.invalidate()
  }, [])

  const generate = async (code: DocumentCode, format: DocumentFormat) => {
    const token = requestVersion.current.start()
    setPending({ code, format })
    setError(null)
    setLastDownloaded(null)

    const client = getSupabaseBrowserClient()
    const result = await generateDocument({
      loadWeldLog: (id) => loadWeldLog(client, { projectId: id }),
      loadNdeRegister: (id) => loadNdeRegister(client, { projectId: id }),
      loadPunchRegister: (id) => loadPunchRegister(client, { projectId: id }),
      loadTestPackSummary: (id) => loadTestPackSummary(client, { projectId: id }),
    }, {
      code,
      format,
      projectId,
      header: { title: t(`reports.${code}.title`), projectCode, projectTitle, generatedAt: new Date(), author, locale },
      chrome,
      labels,
      fonts: () => loadPdfFonts(),
    })

    if (!token.isCurrent()) return
    setPending(null)
    if (!result.ok) {
      setError({ code, failure: result })
      return
    }

    downloadBlob(result.value.blob, result.value.fileName)
    setLastDownloaded(code)
  }

  const describeReportFailure = (failure: Extract<GenerateDocumentResult, { ok: false }>) =>
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
        {PROJECT_DOCUMENTS.map((report) => {
          const reportError = error?.code === report.code ? error.failure : null
          return (
            <Card key={report.code}>
              <CardHeader>
                <CardTitle>{t(`reports.${report.code}.title`)}</CardTitle>
                <CardDescription>{t(`reports.${report.code}.description`)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{report.code} · {report.formats.join(", ").toUpperCase()}</p>
                {reportError ? <p className="text-sm text-destructive">{describeReportFailure(reportError)}</p> : null}
                {lastDownloaded === report.code ? <p className="text-success-fg text-sm">{t("downloaded")}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {report.formats.map((format) => {
                    const busy = pending?.code === report.code && pending.format === format
                    return (
                      <Button
                        key={format}
                        type="button"
                        variant={format === "xlsx" ? "default" : "outline"}
                        onClick={() => void generate(report.code, format)}
                        loading={busy}
                        disabled={pending !== null}
                      >
                        {busy ? null : <Download className="mr-2 size-4" />}
                        {t("download", { format: format.toUpperCase() })}
                      </Button>
                    )
                  })}
                </div>
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
