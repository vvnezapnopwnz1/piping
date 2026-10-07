import type { Messages } from "@/i18n/messages"

export type HelpKey = keyof Messages["help"]

/**
 * Short, optional help. Each hint points at one real control, marked `data-help="<target>"`;
 * a hint whose control is not on screen (hidden by access, not loaded yet) is skipped rather than
 * shown floating over nothing. Rules the user must follow, blockers and errors are never moved
 * here: they stay visible on the screen itself.
 */
export interface HelpHint {
  target: string
  /** A key of the `help` messages: its `title` and `body`. */
  key: HelpKey
}

const STAGE_RAIL: HelpHint = {
  target: "stage-rail",
  key: "stageRail",
}

const MODULE_TABS: HelpHint = {
  target: "module-tabs",
  key: "moduleTabs",
}

const WORK_CONTEXT: HelpHint = {
  target: "work-context",
  key: "workContext",
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
        key: "attention",
      },
      {
        target: "process-map",
        key: "processMap",
      },
    ],
  },
  {
    match: (path) => path === "/projects",
    hints: [
      {
        target: "current-project",
        key: "currentProject",
      },
      {
        target: "project-search",
        key: "projectSearch",
      },
    ],
  },
  {
    match: (path) => ["/erection/rft", "/erection/dashboard", "/erection/field-qc-release"].includes(path),
    hints: [
      {
        target: "rft-blocker",
        key: "rftBlocker",
      },
      {
        target: "rft-table",
        key: "rftTable",
      },
    ],
  },
  {
    match: (path) => path === "/nde",
    hints: [
      {
        target: "nde-record",
        key: "ndeRecord",
      },
    ],
  },
  {
    match: (path) => path === "/fabrication/material-check" || path === "/fabrication",
    hints: [
      {
        target: "trace-input",
        key: "traceInput",
      },
    ],
  },
  {
    match: (path) => FABRICATION_WORKBENCH.includes(path) || ERECTION_WORKBENCH.includes(path),
    hints: [
      {
        target: "rft-blocker",
        key: "rftBlocker2",
      },
      {
        target: "spool-stepper",
        key: "spoolStepper",
      },
    ],
  },
  {
    match: (path) => path === "/testpack/explorer",
    hints: [
      {
        target: "tp-spool-status",
        key: "tpSpoolStatus",
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
