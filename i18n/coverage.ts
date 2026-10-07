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
  "modules/construction/ui/fabrication",
  "modules/construction/ui/gate-reason.ts",
  "modules/construction/ui/material-trace-picker.tsx",
  "modules/construction/ui/panel-mode.ts",
  "modules/construction/ui/spool-drawer.tsx",
  "modules/construction/ui/timeline-lines.ts",
  "modules/construction/ui/use-material-check-workspace.ts",
  "modules/construction/ui/weld-columns.tsx",
  "app/fabrication",
]

export const RU_COMPLETE_NAMESPACES: readonly Namespace[] = ["common", "codes", "shell", "nav", "help", "auth", "fabrication"]
