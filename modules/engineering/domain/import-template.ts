/** Where a weld is made, spelled the way the server stores it. */
export type WeldLocation = "shop" | "assembly" | "field"

/** How a PCF file becomes weld rows: data, not code, so a project can keep its own copy. */
export interface PcfTemplateSettings {
  kind: "pcf"
  /** The weld's SKEY → where it is made. */
  weldLocationBySkey: Record<string, WeldLocation>
  /** A raw weld type (WELD-TYPE, an end type, or the end of the part's SKEY) → the project's code; unmapped codes pass as they are. */
  weldTypeByCode: Record<string, string>
  /** PIPING-SPEC → the project's service class; unmapped specs pass as they are. */
  serviceClassBySpec: Record<string, string>
  /** The isometric number: the file name without extension, or the weld's PIPELINE-REFERENCE. */
  isoNumberFrom: "fileName" | "pipelineReference"
  /** The revision when the pipeline has no REVISION; null makes it a missing value. */
  defaultRevision: string | null
}

export const DEFAULT_PCF_SETTINGS: PcfTemplateSettings = {
  kind: "pcf",
  weldLocationBySkey: { WW: "shop", WS: "field", WF: "field", WO: "field" },
  weldTypeByCode: { WN: "BW" },
  serviceClassBySpec: {},
  isoNumberFrom: "fileName",
  defaultRevision: null,
}
