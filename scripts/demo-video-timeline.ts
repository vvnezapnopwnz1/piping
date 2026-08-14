import * as fs from "fs"

/**
 * One beat in a recorded demo clip: where the action happens (`box`, in the
 * clip's viewport pixels), when it starts relative to clip start, and how
 * long the Remotion render should spend animating it. Consumed by the
 * post-production pass to draw a synthetic cursor/click and to place
 * zoom/caption keyframes — the raw Playwright video carries none of that.
 */
export type TimelineEvent = {
  tMs: number
  durationMs: number
  type: "click" | "type" | "navigate" | "pause"
  caption: string
  box: { x: number; y: number; width: number; height: number } | null
}

export class TimelineRecorder {
  private readonly events: TimelineEvent[] = []
  private readonly startedAt = Date.now()

  record(event: Omit<TimelineEvent, "tMs">) {
    this.events.push({ tMs: Date.now() - this.startedAt, ...event })
  }

  writeTo(jsonPath: string) {
    fs.writeFileSync(jsonPath, JSON.stringify({ events: this.events }, null, 2))
  }
}
