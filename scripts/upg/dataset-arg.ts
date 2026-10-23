// scripts/upg/dataset-arg.ts
import { NPS_SPEC } from "../nps/dataset"
import { UPG_SPEC } from "./dataset"
import type { ProjectSpec } from "./spec"

const SPECS: Record<string, ProjectSpec> = {
  upg: UPG_SPEC,
  nps: NPS_SPEC,
}

/**
 * Resolves the target ProjectSpec from CLI arguments.
 * The default is the existing UPG-1 command, not a fallback to an older format.
 */
export function specFromArgv(argv: readonly string[]): ProjectSpec {
  const index = argv.indexOf("--dataset")
  if (index < 0) return UPG_SPEC
  const name = argv[index + 1]
  if (name === undefined) throw new Error("Use --dataset upg|nps.")
  if (!Object.hasOwn(SPECS, name)) throw new Error(`Unknown dataset "${name}"; use upg|nps.`)
  return SPECS[name]
}
