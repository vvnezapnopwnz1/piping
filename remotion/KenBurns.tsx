import { useMemo, type ReactNode } from "react"
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion"

import type { TimelineEvent } from "./timeline-types"
import { buildCameraKeyframes, interpolateCamera } from "./timeline-motion"

export function KenBurns({
  events,
  width,
  height,
  children,
}: {
  events: TimelineEvent[]
  width: number
  height: number
  children: ReactNode
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const elapsedMs = (frame / fps) * 1000

  const keyframes = useMemo(() => buildCameraKeyframes(events, width, height), [events, width, height])
  const { scale, originXPct, originYPct } = interpolateCamera(keyframes, elapsedMs)

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        transformOrigin: `${originXPct}% ${originYPct}%`,
      }}
    >
      {children}
    </AbsoluteFill>
  )
}
