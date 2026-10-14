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

/**
 * How long the first session and access reads may take before the shell gives up waiting. A
 * stored session refreshes its token over the network, and auth-js retries a network failure
 * without end, so an unreachable Supabase would otherwise leave a returning user on the loading
 * screen forever.
 */
export const AUTH_LOAD_TIMEOUT_MS = 15_000

export class AuthLoadTimeoutError extends Error {
  constructor(milliseconds: number) {
    super(`Supabase did not answer within ${milliseconds / 1000} seconds.`)
    this.name = "AuthLoadTimeoutError"
  }
}

/** Settles like `promise`, or rejects with `AuthLoadTimeoutError` once `milliseconds` pass. */
export function withAuthLoadTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds = AUTH_LOAD_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthLoadTimeoutError(milliseconds)), milliseconds)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (reason: unknown) => {
        clearTimeout(timer)
        reject(reason)
      },
    )
  })
}
