import { Audio, interpolate, Series, staticFile, useCurrentFrame, useVideoConfig } from "remotion"

import type { TimelineEvent } from "./timeline-types"
import { ClipComposition } from "./ClipComposition"
import { TitleCard } from "./TitleCard"

/** 2.5s at the composition's 30fps — see remotion/Root.tsx. */
export const TITLE_CARD_FRAMES = 75

export type ClipSpec = {
  name: string
  title: string
  subtitle: string
  events: TimelineEvent[]
  durationInFrames: number
}

export function DemoVideo({
  width,
  height,
  clips,
}: {
  width: number
  height: number
  clips: ClipSpec[]
}) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  // Smooth audio volume envelope: gentle fade-in and fade-out
  const volume = interpolate(
    frame,
    [0, 30, Math.max(31, durationInFrames - 45), durationInFrames],
    [0, 0.18, 0.18, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  )

  return (
    <>
      <Audio src={staticFile("bg-music.wav")} volume={volume} loop />
      <Series>
        <Series.Sequence durationInFrames={TITLE_CARD_FRAMES}>
          <TitleCard
            title="PipeQC"
            subtitle="Industrial Piping Quality Control & Construction Execution Platform"
          />
        </Series.Sequence>
        {clips.map((clip) => (
          <Series.Sequence key={clip.name} durationInFrames={TITLE_CARD_FRAMES + clip.durationInFrames}>
            <Series>
              <Series.Sequence durationInFrames={TITLE_CARD_FRAMES}>
                <TitleCard title={clip.title} subtitle={clip.subtitle} />
              </Series.Sequence>
              <Series.Sequence durationInFrames={clip.durationInFrames}>
                <ClipComposition clipName={clip.name} events={clip.events} width={width} height={height} />
              </Series.Sequence>
            </Series>
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={TITLE_CARD_FRAMES}>
          <TitleCard
            title="PipeQC"
            subtitle="Complete digital traceability from 3D CAD design to hydrotest handover"
          />
        </Series.Sequence>
      </Series>
    </>
  )
}
