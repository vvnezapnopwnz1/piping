"use client"

import { useEffect, useRef, useState } from "react"
import { FileDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { downloadBlob } from "@/lib/download-blob"
import { createRequestVersion } from "@/lib/request-version"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { generateTestPackDossier } from "../application/generate-dossier"
import type { DocumentFormat } from "../domain/report"
import { loadPdfFonts } from "../infrastructure/renderers/pdf-document"
import { loadTestPackDossier } from "../infrastructure/supabase-report-repository"
import { documentAuthor } from "./document-author"
import { useDossierLabels } from "./document-labels"

/** Downloads the handover dossier of the open test pack: a PDF to sign or an XLSX to edit. */
export function TestPackDossierButton({
  projectId,
  testPackId,
  testPackNumber,
}: {
  projectId: string
  testPackId: string
  testPackNumber: string
}) {
  const t = useTranslations("documents")
  const { access: project, user } = useSupabaseAuth()
  const access = useOptionalAccess()
  const { locale, chrome, labels } = useDossierLabels()
  const [pending, setPending] = useState<DocumentFormat | null>(null)
  const requestVersion = useRef(createRequestVersion())

  useEffect(() => {
    const version = requestVersion.current
    return () => version.invalidate()
  }, [])

  if (!access?.can("reports.view") || !project || !user) return null

  const generate = async (format: DocumentFormat) => {
    const token = requestVersion.current.start()
    setPending(format)
    const client = getSupabaseBrowserClient()
    const result = await generateTestPackDossier({
      loadTestPackDossier: (project, pack) => loadTestPackDossier(client, { projectId: project, testPackId: pack }),
    }, {
      format,
      projectId,
      testPackId,
      header: {
        title: t("dossier.title", { number: testPackNumber }),
        projectCode: project.activityCode,
        projectTitle: project.title,
        generatedAt: new Date(),
        author: documentAuthor(user),
        locale,
      },
      chrome,
      labels,
      fonts: () => loadPdfFonts(),
    })
    if (!token.isCurrent()) return
    setPending(null)
    if (!result.ok) {
      toast.error(result.detail === undefined ? t("error.failedNoDetail") : t("error.failed", { detail: result.detail }))
      return
    }
    downloadBlob(result.value.blob, result.value.fileName)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["pdf", "xlsx"] as const).map((format) => (
        <Button
          key={format}
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void generate(format)}
          loading={pending === format}
          disabled={pending !== null}
        >
          {pending === format ? null : <FileDown className="mr-1 size-4" />}
          {t("dossier.button", { format: format.toUpperCase() })}
        </Button>
      ))}
    </div>
  )
}
