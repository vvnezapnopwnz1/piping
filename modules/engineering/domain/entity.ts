export const ENGINEERING_ENTITY_TYPES = ["spool", "weld_joint", "support", "flange_joint"] as const
export type EngineeringEntityType = (typeof ENGINEERING_ENTITY_TYPES)[number]

export const STAGING_ENTITY_KINDS = ["isometric", "spool", "weld_joint", "support", "flange_joint", "material"] as const
export type StagingEntityKind = (typeof STAGING_ENTITY_KINDS)[number]

export function stagingOrderOf(kind: StagingEntityKind): number {
  return STAGING_ENTITY_KINDS.indexOf(kind)
}

export function isDecidableEntity(kind: StagingEntityKind): kind is EngineeringEntityType {
  return (ENGINEERING_ENTITY_TYPES as readonly string[]).includes(kind)
}
