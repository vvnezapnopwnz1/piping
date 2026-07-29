import type { AppMode } from "@/lib/app-mode"

export interface TopNavMembershipDisplay {
  activityCode: string
  title: string
}

export type TopNavDisplay =
  | { kind: "demo" }
  | {
      kind: "supabase"
      project: TopNavMembershipDisplay
      email: string
      roleLabel: string
    }

export function getTopNavDisplay(
  appMode: AppMode,
  input: {
    membership: TopNavMembershipDisplay | null
    email: string | undefined
    roleLabel: string
  }
): TopNavDisplay {
  if (appMode === "demo") {
    return { kind: "demo" }
  }

  return {
    kind: "supabase",
    project: input.membership ?? {
      activityCode: "Project",
      title: "Loading project…",
    },
    email: input.email ?? "Authenticated user",
    roleLabel: input.roleLabel,
  }
}
