export type SupabaseAccessState =
  | "loading"
  | "unauthenticated"
  | "no_membership"
  | "authorized"

export interface SupabaseAccessUser {
  id: string
}

export interface SupabaseProjectAccess {
  projectId: string
}

export interface MembershipProjectDisplay {
  activityCode: string
  title: string
}

export interface SupabaseProjectAccessDisplay extends MembershipProjectDisplay {
  membershipId: string | null
  projectId: string
  projectCreatedAt: string
}

export function deriveSupabaseAccessState(
  user: SupabaseAccessUser | null,
  access: SupabaseProjectAccess | null
): Exclude<SupabaseAccessState, "loading"> {
  if (!user) {
    return "unauthenticated"
  }

  return access ? "authorized" : "no_membership"
}

export function synchronizeProjectAccessDisplay<
  Access extends SupabaseProjectAccessDisplay,
>(
  access: Access | null,
  projectId: string,
  project: MembershipProjectDisplay,
): Access | null {
  if (!access || access.projectId !== projectId) {
    return access
  }

  return {
    ...access,
    activityCode: project.activityCode,
    title: project.title,
  }
}

export function sortProjectAccessesForDisplay<Access extends SupabaseProjectAccessDisplay>(
  accesses: readonly Access[],
): Access[] {
  return [...accesses].sort(
    (left, right) =>
      left.projectCreatedAt.localeCompare(right.projectCreatedAt) ||
      left.activityCode.localeCompare(right.activityCode) ||
      left.title.localeCompare(right.title) ||
      (left.membershipId ?? "").localeCompare(right.membershipId ?? ""),
  )
}

export function resolveActiveProjectAccess<Access extends SupabaseProjectAccessDisplay>(
  accesses: readonly Access[],
  preferredProjectId: string | null,
): Access | null {
  const sorted = sortProjectAccessesForDisplay(accesses)
  return sorted.find((access) => access.projectId === preferredProjectId)
    ?? sorted[0]
    ?? null
}

/**
 * The project a page address names with `?p=<code>`, when the user has active access to it. A
 * fresh load opens that project directly instead of the remembered one, so the page never shows
 * — or loads data for — another project first.
 */
export function projectIdForAddress<
  Access extends { projectId: string; activityCode: string; projectStatus?: string | null },
>(accesses: readonly Access[], search: string): string | null {
  const code = new URLSearchParams(search).get("p")
  if (!code) return null
  return (
    accesses.find(
      (access) =>
        access.activityCode === code && (access.projectStatus === undefined || access.projectStatus === "active"),
    )?.projectId ?? null
  )
}

export function activeProjectStorageKey(userId: string): string {
  return `pipeqc.active-project:${userId}`
}
