import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion"

import type { TimelineEvent } from "./timeline-types"
import { KenBurns } from "./KenBurns"
import { Cursor } from "./Cursor"
import { Caption } from "./Caption"

export function ClipComposition({
  clipName,
  events,
  width,
  height,
}: {
  clipName: string
  events: TimelineEvent[]
  width: number
  height: number
}) {
  return (
    <AbsoluteFill style={{ background: "#0b0d10" }}>
      <KenBurns events={events} width={width} height={height}>
        <OffthreadVideo
          src={staticFile(`${clipName}.webm`)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </KenBurns>
      <Cursor events={events} />
      <Caption events={events} />
    </AbsoluteFill>
  )
}
