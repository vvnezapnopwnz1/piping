"use client"

import { Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { downloadBlob } from "@/lib/download-blob"
import { buildWorkbook } from "@/modules/imports/infrastructure/xlsx-workbook"
import { templateKindOf, type ImportReferences, type ImportSourceId } from "../domain/import-template"
import { SPOOLGEN_FILE_ROLES } from "../domain/spoolgen-file"
import { buildTemplateText } from "../infrastructure/import-template-files"
import { PCF_SAMPLE, PCF_SAMPLE_FILE_NAME } from "../infrastructure/pcf-sample"
import { tableTemplateSheets } from "./import-template-sheets"

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/**
 * What a tile hands out before anything is picked: for Excel the workbook (a sheet per role, the help and the project's
 * codes); for SpoolGen the four tab-separated files; for a CAD source the sample PCF and the keywords we read. Every
 * file is built from the same data the import reads, so the two cannot drift.
 */
export function ImportTemplateDownload({ source, references, disabled }: {
  source: ImportSourceId
  references: ImportReferences | null
  disabled: boolean
}) {
  const t = useTranslations("spooling")
  const tc = useTranslations("codes")

  if (templateKindOf(source) === "pcf") {
    return (
      <div className="space-y-1">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => downloadBlob(new Blob([PCF_SAMPLE], { type: "text/plain;charset=utf-8" }), PCF_SAMPLE_FILE_NAME)}>
          <Download />{t("templates.download.pcf")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("templates.download.pcfReads")}</p>
      </div>
    )
  }

  if (source === "spoolgen") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            <Download />{t("templates.download.spoolgen")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SPOOLGEN_FILE_ROLES.map((role) => (
            <DropdownMenuItem key={role} onClick={() => downloadBlob(new Blob([buildTemplateText(role)], { type: "text/plain;charset=utf-8" }), `${role}.txt`)}>
              {tc(`spoolgenRole.${role}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => downloadBlob(new Blob([buildWorkbook(tableTemplateSheets(t, references))], { type: XLSX_TYPE }), "spooling-template.xlsx")}>
      <Download />{t("templates.download.tableXlsx")}
    </Button>
  )
}
