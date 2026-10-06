/**
 * Short, optional help. Each hint points at one real control, marked `data-help="<target>"`;
 * a hint whose control is not on screen (hidden by access, not loaded yet) is skipped rather than
 * shown floating over nothing. Rules the user must follow, blockers and errors are never moved
 * here: they stay visible on the screen itself.
 */
export interface HelpHint {
  target: string
  title: string
  body: string
}

const STAGE_RAIL: HelpHint = {
  target: "stage-rail",
  title: "Stages and services",
  body: "Stages run left to right from spooling to test packs. NDE, Tracking and Flanges serve several stages, so they sit beside them. Your project stays selected wherever you go.",
}

const MODULE_TABS: HelpHint = {
  target: "module-tabs",
  title: "Pages of this module",
  body: "Every page of the current module you can open is a tab here. Use the stage rail above to move to another module.",
}

const WORK_CONTEXT: HelpHint = {
  target: "work-context",
  title: "Selected object",
  body: "The spool or test pack you picked stays selected as you move between pages that work on it. Clear it to see everything again.",
}

const FABRICATION_WORKBENCH = [
  "/fabrication",
  "/fabrication/material-check",
  "/fabrication/weld-progress",
  "/fabrication/qc-release",
  "/fabrication/pwht-release",
  "/fabrication/paint",
  "/fabrication/laydown",
]

const ERECTION_WORKBENCH = [
  "/erection",
  "/erection/to-site",
  "/erection/material-check",
  "/erection/erected",
  "/erection/welded-bolted",
  "/erection/weld-progress",
  "/erection/supported",
]

const ROUTE_HINTS: ReadonlyArray<{ match: (path: string) => boolean; hints: HelpHint[] }> = [
  {
    match: (path) => path === "/",
    hints: [
      {
        target: "attention",
        title: "Start with what is open",
        body: "Each row counts open work in this project and opens the list where it is done, already narrowed to it.",
      },
      {
        target: "process-map",
        title: "One map, one navigation",
        body: "The cards are the same stages and services you move between inside modules. Open a card to work in it.",
      },
    ],
  },
  {
    match: (path) => path === "/projects",
    hints: [
      {
        target: "current-project",
        title: "Open or return",
        body: "Return keeps the project you are in. Opening another project switches every page to it and drops the previous project's searches and selections.",
      },
      {
        target: "project-search",
        title: "Find a project",
        body: "Search matches the project code, title, owner, contractor and contract number.",
      },
    ],
  },
  {
    match: (path) => ["/erection/rft", "/erection/dashboard", "/erection/field-qc-release"].includes(path),
    hints: [
      {
        target: "rft-blocker",
        title: "Open the blocker",
        body: "Each open item links to the screen where it is resolved, with this spool already selected. Back on that screen returns here.",
      },
      {
        target: "rft-table",
        title: "Ready for Test is derived",
        body: "It opens once Welded / Bolted and Supported are recorded and no NDE obligation or PWHT requirement is open; no screen sets it by hand. Material columns count evidence from either phase.",
      },
    ],
  },
  {
    match: (path) => path === "/nde",
    hints: [
      {
        target: "nde-record",
        title: "Record a result",
        body: "Only an issued obligation takes a result. A rejected result needs a defect code before it can be recorded.",
      },
    ],
  },
  {
    match: (path) => path === "/fabrication/material-check" || path === "/fabrication",
    hints: [
      {
        target: "trace-input",
        title: "Heat / trace numbers",
        body: "Material Check completes once every ident code carries a trace number the PML accepts. Why it cannot be recorded yet is shown under the table.",
      },
    ],
  },
  {
    match: (path) => FABRICATION_WORKBENCH.includes(path) || ERECTION_WORKBENCH.includes(path),
    hints: [
      {
        target: "rft-blocker",
        title: "Resolve an open criterion",
        body: "Each open criterion links to where it is resolved, with this spool already selected. Ready for Test itself is derived and never set by hand.",
      },
      {
        target: "spool-stepper",
        title: "The spool's own steps",
        body: "Every step of the selected spool with its dates, in process order. The step it needs next opens by default; open any other to review or record it.",
      },
    ],
  },
  {
    match: (path) => path === "/testpack/explorer",
    hints: [
      {
        target: "tp-spool-status",
        title: "Spools of this pack",
        body: "A spool that is not Ready for Test links to its readiness and to its open NDE work. Back returns to this pack.",
      },
    ],
  },
]

/** Hints for a path, most specific first; the shell-level hints come last as a fallback. */
export function helpHintsFor(pathname: string): HelpHint[] {
  const specific = ROUTE_HINTS.filter((entry) => entry.match(pathname)).flatMap((entry) => entry.hints)
  if (pathname === "/" || pathname === "/projects") return specific
  return [...specific, WORK_CONTEXT, MODULE_TABS, STAGE_RAIL]
}

export interface HelpPreferences {
  /** Stop suggesting hints with the dot on the Help button. Help itself always stays available. */
  suppress: boolean
  /** Paths whose hint the user has already opened. */
  seen: string[]
}

export const DEFAULT_HELP_PREFERENCES: HelpPreferences = { suppress: false, seen: [] }

export function helpStorageKey(userId: string): string {
  return `pipeqc.help.v1:${userId}`
}

export function parseHelpPreferences(raw: string | null): HelpPreferences {
  if (!raw) return DEFAULT_HELP_PREFERENCES
  try {
    const value = JSON.parse(raw) as Partial<HelpPreferences>
    return {
      suppress: value.suppress === true,
      seen: Array.isArray(value.seen) ? value.seen.filter((item) => typeof item === "string").slice(-200) : [],
    }
  } catch {
    return DEFAULT_HELP_PREFERENCES
  }
}

export interface CoachPlacement {
  left: number
  top: number
  caretLeft: number
  place: "below" | "above"
}

/**
 * Where the coach mark goes for a target rectangle: below it when there is room (or more room
 * than above), clamped inside the viewport under the sticky header, with the caret pointing at
 * the target's centre.
 */
export function placeCoach(input: {
  target: { top: number; bottom: number; left: number; width: number }
  coach: { width: number; height: number }
  viewport: { width: number; height: number }
  headerBottom: number
}): CoachPlacement {
  const { target, coach, viewport, headerBottom } = input
  const margin = 8
  const below = viewport.height - target.bottom - 12
  const above = target.top - headerBottom - 12
  const place = below >= coach.height + margin || below >= above ? "below" : "above"
  const rawTop = place === "below" ? target.bottom + 12 : target.top - coach.height - 12
  const top = Math.min(
    Math.max(rawTop, headerBottom + margin),
    Math.max(headerBottom + margin, viewport.height - coach.height - margin),
  )
  const centre = target.left + target.width / 2
  const left = Math.min(
    Math.max(centre - coach.width / 2, margin),
    Math.max(margin, viewport.width - coach.width - margin),
  )
  const caretLeft = Math.min(Math.max(centre - left - 7, 12), Math.max(12, coach.width - 26))
  return { left, top, caretLeft, place }
}
