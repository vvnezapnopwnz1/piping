import { Series } from "remotion"

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
  return (
    <Series>
      <Series.Sequence durationInFrames={TITLE_CARD_FRAMES}>
        <TitleCard
          title="PipeQC"
          subtitle="Industrial piping construction & quality control — golden path walkthrough"
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
        <TitleCard title="PipeQC" subtitle="Every screen reads its own figures from the database." />
      </Series.Sequence>
    </Series>
  )
}
