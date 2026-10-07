import type { Namespace } from "./messages"

/**
 * What is fully translated. Each translation task adds its paths and namespaces; the tests then
 * forbid hard-coded English in those paths and missing Russian keys in those namespaces.
 */
export const I18N_DONE_PATHS: readonly string[] = [
  "components/pipeqc/locale-switch.tsx",
]

export const RU_COMPLETE_NAMESPACES: readonly Namespace[] = ["common"]
