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

export interface TopNavDisplay {
  project: TopNavAccessDisplay
  projects: TopNavProjectChoice[]
  canSwitchProject: boolean
  email: string
  accessLabels: string[]
}

/**
 * The header shows the active project and who is signed in. Both come from the session, so the
 * only case to handle is the one where the access summary has not arrived yet.
 */
export function getTopNavDisplay(input: {
  access: TopNavAccessDisplay | null
  projectAccesses: TopNavProjectChoice[]
  email: string | undefined
}): TopNavDisplay {
  const fallbackProject: TopNavAccessDisplay = {
    projectId: "loading",
    activityCode: "Project",
    title: "Loading project…",
    accessLabels: [],
  }

  return {
    project: input.access ?? fallbackProject,
    projects: input.projectAccesses,
    canSwitchProject: input.projectAccesses.length > 1,
    email: input.email ?? "Authenticated user",
    accessLabels: input.access?.accessLabels ?? [],
  }
}
