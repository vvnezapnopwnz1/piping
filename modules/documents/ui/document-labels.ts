"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"

import type { DocumentChrome, DocumentLocale } from "../domain/document"
import { DOCUMENT_COLUMNS, type DocumentColumn, type RegisterLabels } from "../domain/registers"
import type { DossierLabels } from "../domain/test-pack-dossier"

const LOCATIONS = ["shop", "assembly", "field"] as const
const METHODS = ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"] as const
const SELECTIONS = ["full", "spot"] as const
const DISPOSITIONS = ["pending", "issued", "satisfied", "rejected", "waived", "superseded"] as const
const OUTCOMES = ["accepted", "rejected"] as const
const MEDIA = ["H", "P", "V"] as const

function words<Key extends string>(keys: readonly Key[], translate: (key: Key) => string): Record<Key, string> {
  return Object.fromEntries(keys.map((key) => [key, translate(key)])) as Record<Key, string>
}

/** The words of every document in the reader's language: page chrome and register labels. */
export function useDocumentLabels(): { locale: DocumentLocale; chrome: DocumentChrome; labels: RegisterLabels } {
  const t = useTranslations("documents")
  const codes = useTranslations("codes")
  const locale: DocumentLocale = useLocale() === "ru" ? "ru" : "en"

  return useMemo(() => ({
    locale,
    chrome: {
      generatedLabel: t("chrome.generated"),
      authorLabel: t("chrome.author"),
      page: (n: number, total: number) => t("chrome.page", { n, total }),
      noRecords: t("chrome.noRecords"),
    },
    labels: {
      locale,
      columns: words<DocumentColumn>(DOCUMENT_COLUMNS, (column) => t(`columns.${column}`)),
      location: words(LOCATIONS, (code) => t(`values.location.${code}`)),
      method: words(METHODS, (code) => codes(`ndeMethod.${code}`)),
      selection: words(SELECTIONS, (code) => t(`values.selection.${code}`)),
      disposition: words(DISPOSITIONS, (code) => t(`values.disposition.${code}`)),
      outcome: words(OUTCOMES, (code) => t(`values.outcome.${code}`)),
      ndeStatus: words(["pending", "rejected", "done"] as const, (code) => t(`values.ndeStatus.${code}`)),
      pwht: words(["required", "accepted"] as const, (code) => t(`values.pwht.${code}`)),
      punchStatus: words(["open", "closed"] as const, (code) => t(`values.punchStatus.${code}`)),
      medium: words(MEDIA, (code) => t(`values.medium.${code}`)),
      yes: t("values.yes"),
      no: t("values.no"),
    },
  }), [codes, locale, t])
}

const SECTIONS = ["pack", "act", "isos", "weldHistory", "nde", "punch"] as const
const FACTS = [
  "testPack", "system", "subsystem", "lineService", "medium", "testPressure", "location", "composition", "rftOn",
  "testingStarted", "testingCompleted", "precommissioning", "testDate",
] as const
const ACT_GROUPS = ["pipeline", "operating", "strength", "tightness"] as const
const ACT_COLUMNS = [
  "number", "pipeline", "pressure", "temperature", "medium", "testType", "testPressure", "duration", "pressureDrop",
  "allowedDrop",
] as const
const SIGNATURES = ["position", "name", "signature", "date"] as const

/** The register words plus the dossier's own: section titles, pack facts and the act blank. */
export function useDossierLabels(): { locale: DocumentLocale; chrome: DocumentChrome; labels: DossierLabels } {
  const t = useTranslations("documents")
  const { locale, chrome, labels } = useDocumentLabels()

  return useMemo(() => ({
    locale,
    chrome,
    labels: {
      ...labels,
      sections: words(SECTIONS, (key) => t(`dossier.sections.${key}`)),
      facts: words(FACTS, (key) => t(`dossier.facts.${key}`)),
      composition: (isos: number, welds: number) => t("dossier.composition", { isos, welds }),
      act: {
        groups: words(ACT_GROUPS, (key) => t(`dossier.act.groups.${key}`)),
        columns: words(ACT_COLUMNS, (key) => t(`dossier.act.columns.${key}`)),
        testType: words(["hydraulic", "pneumatic"] as const, (key) => t(`dossier.act.testType.${key}`)),
        conclusion: t("dossier.act.conclusion"),
        signatures: words(SIGNATURES, (key) => t(`dossier.act.signatures.${key}`)),
        footnote: t("dossier.act.footnote"),
      },
    },
  }), [chrome, labels, locale, t])
}
