import type { AppMode } from "@/lib/app-mode"

export interface TopNavAccessDisplay {
  projectId: string
  activityCode: string
  title: string
  accessLabels: string[]
}

export interface TopNavProjectChoice {
  projectId: string
  activityCode: string
  title: string
  accessLabels: string[]
}

export type TopNavDisplay =
  | { kind: "demo" }
  | {
      kind: "supabase"
      project: TopNavAccessDisplay
      projects: TopNavProjectChoice[]
      canSwitchProject: boolean
      email: string
      accessLabels: string[]
    }

export function getTopNavDisplay(
  appMode: AppMode,
  input: {
    access: TopNavAccessDisplay | null
    projectAccesses: TopNavProjectChoice[]
    email: string | undefined
  }
): TopNavDisplay {
  if (appMode === "demo") {
    return { kind: "demo" }
  }

  const fallbackProject: TopNavAccessDisplay = {
    projectId: "loading",
    activityCode: "Project",
    title: "Loading project…",
    accessLabels: [],
  }

  return {
    kind: "supabase",
    project: input.access ?? fallbackProject,
    projects: input.projectAccesses,
    canSwitchProject: input.projectAccesses.length > 1,
    email: input.email ?? "Authenticated user",
    accessLabels: input.access?.accessLabels ?? [],
  }
}
