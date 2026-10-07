/** Terms fixed in docs/i18n/glossary-ru.md. A banned variant names the term to use instead. */
export const BANNED_RU_TERMS: readonly { pattern: RegExp; use: string }[] = [
  { pattern: /спул/i, use: "катушка" },
  { pattern: /полев\S* стык/i, use: "монтажный стык" },
  { pattern: /пакет\S* испытаний/i, use: "тест-пакет" },
  { pattern: /недодел/i, use: "замечание" },
  { pattern: /(^|[^А-Яа-яЁё])НК([^А-Яа-яЁё]|$)/, use: "NDE" },
]

/** Messages that read the same in Russian: product and file-format names. */
export const SAME_IN_BOTH: ReadonlySet<string> = new Set(["PipeQC", "SpoolGen", "Excel"])
