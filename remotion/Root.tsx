import { parseMedia } from "@remotion/media-parser"
import { webReader } from "@remotion/media-parser/web"
import { Composition, staticFile } from "remotion"

import { DemoVideo, TITLE_CARD_FRAMES, type ClipSpec } from "./DemoVideo"
import type { TimelineFile } from "./timeline-types"

const FPS = 30
const WIDTH = 1600
const HEIGHT = 1000

const MISSING_CLIP_HINT =
  'Run "npm run demo:record-video" first to capture the clips this composition renders.'

/** One entry per clip captured by scripts/demo-golden-path.ts, in playback order. */
const CLIP_PLAN: { name: string; title: string; subtitle: string }[] = [
  {
    name: "golden-path-fabrication",
    title: "Fabrication",
    subtitle: "TRACK01-A — SpoolGen import, material check, shop welds",
  },
  {
    name: "golden-path-nde",
    title: "NDE",
    subtitle: "TRACK01-A — inspection batches, allocation, accepted results",
  },
  {
    name: "golden-path-qc-release",
    title: "QC Release",
    subtitle: "TRACK01-A — supports, PWHT, spool release",
  },
  {
    name: "golden-path-erection",
    title: "Erection",
    subtitle: "TRACK01-A — to site, erected, welded/bolted, supported, ready for test",
  },
  {
    name: "golden-path-testpack",
    title: "Test Pack",
    subtitle: "TRACK01-A — composing an accepted ISO into a Test Pack",
  },
  {
    name: "showcase-dashboards",
    title: "Live dashboards",
    subtitle: "SHOWCASE-1 — twelve weeks of seeded progress",
  },
]

async function readTimeline(clipName: string): Promise<TimelineFile> {
  const response = await fetch(staticFile(`${clipName}.timeline.json`))
  if (!response.ok) {
    throw new Error(`Missing demo-video/${clipName}.timeline.json. ${MISSING_CLIP_HINT}`)
  }
  return (await response.json()) as TimelineFile
}

async function clipDurationInFrames(clipName: string): Promise<number> {
  const src = staticFile(`${clipName}.webm`)
  const head = await fetch(src, { method: "HEAD" })
  if (!head.ok) {
    throw new Error(`Missing demo-video/${clipName}.webm. ${MISSING_CLIP_HINT}`)
  }
  const { durationInSeconds } = await parseMedia({
    src,
    fields: { durationInSeconds: true },
    reader: webReader,
  })
  return Math.max(1, Math.round((durationInSeconds ?? 0) * FPS))
}

export function RemotionRoot() {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={TITLE_CARD_FRAMES}
      defaultProps={{
        width: WIDTH,
        height: HEIGHT,
        clips: [] as ClipSpec[],
      }}
      calculateMetadata={async () => {
        const clips: ClipSpec[] = await Promise.all(
          CLIP_PLAN.map(async (plan) => {
            const [timeline, durationInFrames] = await Promise.all([
              readTimeline(plan.name),
              clipDurationInFrames(plan.name),
            ])
            return { ...plan, events: timeline.events, durationInFrames }
          }),
        )

        const totalDuration =
          TITLE_CARD_FRAMES * (clips.length + 2) +
          clips.reduce((sum, clip) => sum + clip.durationInFrames, 0)

        return {
          durationInFrames: totalDuration,
          props: { width: WIDTH, height: HEIGHT, clips },
        }
      }}
    />
  )
}
