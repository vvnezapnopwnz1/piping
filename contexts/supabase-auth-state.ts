import type { Role } from "./role-context"

export type SupabaseAccessState =
  | "loading"
  | "unauthenticated"
  | "no_membership"
  | "authorized"

export interface SupabaseAccessUser {
  id: string
}

export interface SupabaseAccessMembership {
  projectId: string
  role: Role
}

export interface MembershipProjectDisplay {
  activityCode: string
  title: string
}

export interface SupabaseMembershipDisplay extends MembershipProjectDisplay {
  membershipId: string
  projectId: string
  role: Role
}

export function deriveSupabaseAccessState(
  user: SupabaseAccessUser | null,
  membership: SupabaseAccessMembership | null
): Exclude<SupabaseAccessState, "loading"> {
  if (!user) {
    return "unauthenticated"
  }

  return membership ? "authorized" : "no_membership"
}

export function synchronizeMembershipProjectDisplay<
  Membership extends SupabaseMembershipDisplay,
>(
  membership: Membership | null,
  projectId: string,
  project: MembershipProjectDisplay,
): Membership | null {
  if (!membership || membership.projectId !== projectId) {
    return membership
  }

  return {
    ...membership,
    activityCode: project.activityCode,
    title: project.title,
  }
}
