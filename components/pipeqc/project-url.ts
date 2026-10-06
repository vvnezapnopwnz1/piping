import type { ProjectAccessSummary } from "@/modules/access/infrastructure/supabase-access-repository"

/** The query key carrying the selected project's code. */
export const PROJECT_PARAM = "p"

export type ProjectUrlDecision =
  | { kind: "keep" }
  | { kind: "switch"; project: ProjectAccessSummary }
  | { kind: "unavailable" }

/**
 * What a `?p=<code>` in the address means for the open project. The address wins when the user
 * may open that project, so Back and pasted links land in the project they were made in; a code
 * the user has no active access to never switches anything.
 */
export function resolveRequestedProject(
  requested: string | null,
  current: string,
  available: readonly Pick<ProjectAccessSummary, "projectId" | "activityCode" | "projectStatus">[],
): ProjectUrlDecision {
  if (!requested || requested === current) return { kind: "keep" }
  const project = available.find(
    (candidate) => candidate.activityCode === requested && candidate.projectStatus === "active",
  )
  return project ? { kind: "switch", project: project as ProjectAccessSummary } : { kind: "unavailable" }
}

/** A workspace path pinned to a project, for links that must open in that project. */
export function withProject(href: string, code: string | null | undefined): string {
  if (!code) return href
  const [path, query = ""] = href.split("?")
  const params = new URLSearchParams(query)
  params.set(PROJECT_PARAM, code)
  return `${path}?${params.toString()}`
}
