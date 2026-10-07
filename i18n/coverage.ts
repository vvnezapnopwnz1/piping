import type { Namespace } from "./messages"

/**
 * What is fully translated. Each translation task adds its paths and namespaces; the tests then
 * forbid hard-coded English in those paths and missing Russian keys in those namespaces.
 */
export const I18N_DONE_PATHS: readonly string[] = [
  "components/pipeqc",
  "components/auth",
  "components/ui",
  "config",
  "contexts",
]

export const RU_COMPLETE_NAMESPACES: readonly Namespace[] = ["common", "codes", "shell", "nav", "help", "auth"]
