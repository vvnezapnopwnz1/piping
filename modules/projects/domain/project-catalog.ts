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

export function projectRoleLabel(project: ProjectAccessSummary): string {
  if (project.isPlatformAdmin) return "System Admin"
  const labels = {
    project_admin: "Project Admin",
    site_admin: "Site Admin",
    project_editor: "Project Editor",
    subcontractor: "Subcontractor",
    project_reader: "Project Reader",
  }
  return project.accessRole ? labels[project.accessRole] : "Project access"
}
