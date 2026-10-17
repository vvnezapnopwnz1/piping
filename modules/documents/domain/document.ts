export type DocumentLocale = "ru" | "en"

export interface DocumentHeader {
  title: string
  projectCode: string
  projectTitle: string
  generatedAt: Date
  author: string
  locale: DocumentLocale
}

/** The words every document prints around its tables, already in the reader's language. */
export interface DocumentChrome {
  generatedLabel: string
  authorLabel: string
  page: (n: number, total: number) => string
  noRecords: string
}

export type Cell = string | number | null

export interface DocumentTable {
  head: string[]
  body: Cell[][]
}

/** Orders ISO, spool and weld numbers the way people read them: `W-2` before `W-10`. */
export function compareCodes(a: string, b: string): number {
  return a.localeCompare(b, "ru", { numeric: true })
}

/** Title, project, snapshot time and author: the four lines on top of every document. */
export function headerLines(header: DocumentHeader, chrome: DocumentChrome): [string, string, string, string] {
  const generated = new Intl.DateTimeFormat(header.locale === "ru" ? "ru-RU" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(header.generatedAt)
  return [
    header.title,
    [header.projectCode, header.projectTitle].filter(Boolean).join(" — "),
    `${chrome.generatedLabel}: ${generated}`,
    `${chrome.authorLabel}: ${header.author}`,
  ]
}
