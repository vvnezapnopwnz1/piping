import type { useTranslations } from "next-intl"

import type { Messages } from "./messages"

/** The `codes` translator, for column definitions and helpers that are built outside a component. */
export type CodesTranslator = ReturnType<typeof useTranslations<"codes">>

/** The label for a code that comes from the database, or the code itself when no message names it. */
export function codeLabel(tc: CodesTranslator, group: keyof Messages["codes"], code: string): string {
  const key = `${group}.${code}` as Parameters<CodesTranslator>[0]
  return tc.has(key) ? tc(key) : code
}
