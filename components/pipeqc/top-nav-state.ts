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
  /** What the header says before the access summary arrives, in the current language. */
  fallback: { activityCode: string; title: string; email: string }
}): TopNavDisplay {
  const fallbackProject: TopNavAccessDisplay = {
    projectId: "loading",
    activityCode: input.fallback.activityCode,
    title: input.fallback.title,
    accessLabels: [],
  }

  return {
    project: input.access ?? fallbackProject,
    projects: input.projectAccesses,
    canSwitchProject: input.projectAccesses.length > 1,
    email: input.email ?? input.fallback.email,
    accessLabels: input.access?.accessLabels ?? [],
  }
}
