import type { ProjectAccessSummary } from "@/modules/access/infrastructure/supabase-access-repository"
import type { Database } from "@/lib/supabase/database.types"

export type ProjectCatalogMetadata = Pick<
  Database["public"]["Tables"]["projects"]["Row"],
  "id" | "owner_name" | "contractor_name" | "contract_number"
>

export function filterProjectCatalog(
  available: readonly ProjectAccessSummary[],
  metadata: readonly ProjectCatalogMetadata[],
  query: string,
): ProjectAccessSummary[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const byId = new Map(metadata.map((row) => [row.id, row]))
  return available.filter((project) => {
    const detail = byId.get(project.projectId)
    const haystack = [
      project.activityCode,
      project.title,
      detail?.owner_name,
      detail?.contractor_name,
      detail?.contract_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

export function resolveProjectToOpen(
  available: readonly ProjectAccessSummary[],
  id: string,
): ProjectAccessSummary | null {
  return (
    available.find(
      (project) =>
        project.projectId === id && project.projectStatus === "active",
    ) ?? null
  )
}

/** The `codes.accessRole` code to show for a project; null when the account holds no role in it. */
export function projectRoleCode(project: ProjectAccessSummary): "platform_admin" | NonNullable<ProjectAccessSummary["accessRole"]> | null {
  if (project.isPlatformAdmin) return "platform_admin"
  return project.accessRole ?? null
}
