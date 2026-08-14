import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"

import type { TimelineEvent } from "./timeline-types"

const MIN_VISIBLE_MS = 1400
const FADE_MS = 200

export function Caption({ events }: { events: TimelineEvent[] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const elapsedMs = (frame / fps) * 1000

  const captioned = events.filter((e) => e.caption)
  const current = [...captioned].reverse().find((e) => e.tMs <= elapsedMs)
  if (!current) return null

  const localMs = elapsedMs - current.tMs
  const visibleMs = Math.max(current.durationMs, MIN_VISIBLE_MS)
  if (localMs > visibleMs) return null

  const opacity = interpolate(
    localMs,
    [0, FADE_MS, visibleMs - FADE_MS, visibleMs],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  )

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: 56,
          padding: "10px 22px",
          borderRadius: 8,
          background: "rgba(11,13,16,0.82)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          fontSize: 22,
          fontWeight: 500,
          opacity,
        }}
      >
        {current.caption}
      </div>
    </AbsoluteFill>
  )
}
