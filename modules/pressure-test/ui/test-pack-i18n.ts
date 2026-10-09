"use client"

import { useTranslations, type TranslationValues } from "next-intl"
import { useCallback } from "react"
import { errorDetail } from "@/i18n/format"
import { toast } from "sonner"

export type TestPackTranslator = (key: string, values?: TranslationValues) => string

/** Pure models hold message keys; persisted values and project reference descriptions stay data. */
export function useTestPackTranslations(): TestPackTranslator {
  const t = useTranslations("testPack")
  const common = useTranslations("common")
  const codes = useTranslations("codes")
  return useCallback((key: string, values?: TranslationValues) => {
    if (key === "—" || key === "ISO") return key
    if (key === "text.cancel") return common("actions.cancel")
    if (key === "text.retry") return common("ui.retry")
    if (key.startsWith("codes.")) return codes(key.slice(6) as Parameters<typeof codes>[0], values)
    return t(key as Parameters<typeof t>[0], values)
  }, [t, common, codes])
}

/** A translated title remains visible even when the server supplies only an English detail. */
export function reportTestPackError(error: unknown, title: string): string {
  toast.error(title, { description: errorDetail(error) })
  return title
}

const validationFields: Record<string, string> = {
  testPackNumber: "text.testPackNumber", location: "text.location", priority: "text.priority",
  medium: "text.testMedium", pressure: "text.testPressure", volumeM3: "text.volume",
  plannedStartOn: "text.plannedStart", plannedEndOn: "text.plannedEnd",
  systemId: "text.system", subsystemId: "text.subsystem", serviceClassId: "text.serviceClass",
  lineServiceId: "text.lineService", testPackId: "text.testPack", isometricId: "text.isoNumber",
  punchCodeId: "text.punchCodeOptional", description: "text.punchDescription", checkingDate: "text.eventDate",
  completionDate: "text.eventDate", assignedDate: "text.assignedDate", occurredOn: "text.eventDate",
  teamId: "text.team", isometricIds: "text.isoNumber", stage: "text.progress",
}

export function testPackValidationMessages(errors: Partial<Record<string, string>>, t: TestPackTranslator): string {
  return Object.entries(errors).flatMap(([field, code]) =>
    code === undefined ? [] : [t(`validation.${code}`, code === "required" ? { field: t(validationFields[field] ?? "text.testPack") } : undefined)],
  ).join("; ")
}
