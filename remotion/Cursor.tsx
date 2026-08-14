import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion"

import type { TimelineEvent } from "./timeline-types"
import { getCursorVisual } from "./timeline-motion"

export function Cursor({ events }: { events: TimelineEvent[] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const elapsedMs = (frame / fps) * 1000

  const { x, y, opacity, rippleProgress } = getCursorVisual(events, elapsedMs)
  if (opacity <= 0.01) return null

  const rippleSize = 12 + rippleProgress * 60

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {rippleProgress > 0 && (
        <div
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: rippleSize,
            height: rippleSize,
            marginLeft: -rippleSize / 2,
            marginTop: -rippleSize / 2,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.85)",
            opacity: 1 - rippleProgress,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 16,
          height: 16,
          marginLeft: -8,
          marginTop: -8,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.95)",
          border: "2px solid rgba(0,0,0,0.35)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          opacity,
        }}
      />
    </AbsoluteFill>
  )
}
