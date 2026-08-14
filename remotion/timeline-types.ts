/**
 * Mirrors `TimelineEvent` from `scripts/demo-video-timeline.ts`. Duplicated
 * (types only, zero runtime cost) rather than imported, because that module
 * pulls in Node's `fs` at the top level — fine for the capture script, not
 * for this browser-bundled render pipeline.
 */
export type TimelineEvent = {
  tMs: number
  durationMs: number
  type: "click" | "type" | "navigate" | "pause"
  caption: string
  box: { x: number; y: number; width: number; height: number } | null
}

export type TimelineFile = { events: TimelineEvent[] }
