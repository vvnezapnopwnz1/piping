"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"

import type { DocumentChrome, DocumentLocale } from "../domain/document"
import { DOCUMENT_COLUMNS, type DocumentColumn, type RegisterLabels } from "../domain/registers"

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
