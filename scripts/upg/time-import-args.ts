// scripts/upg/time-import-args.ts
import { UPG_ISOS } from "./dataset"

export interface TimeImportArgs {
  readonly copies: number
  readonly perJob: number
}

function positiveInteger(argv: readonly string[], flag: string): number | null {
  const index = argv.indexOf(flag)
  if (index < 0) return null
  const value = Number(argv[index + 1])
  if (!Number.isInteger(value) || value < 1) throw new Error(`Use ${flag} N with N >= 1.`)
  return value
}

/** `--isos n` asks for a target ISO count; it resolves to whole copies of the 40 UPG ISOs. */
export function parseTimeImportArgs(argv: readonly string[]): TimeImportArgs {
  const isos = positiveInteger(argv, "--isos")
  const copies = positiveInteger(argv, "--copies")
  if (isos !== null && copies !== null) throw new Error("Use either --isos or --copies, not both.")
  return {
    copies: isos !== null ? Math.ceil(isos / UPG_ISOS.length) : (copies ?? 5),
    perJob: positiveInteger(argv, "--per-job") ?? 1,
  }
}
