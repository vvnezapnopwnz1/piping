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
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          marginBottom: 44,
          maxWidth: "88%",
          textAlign: "center",
          padding: "12px 28px",
          borderRadius: 12,
          background: "rgba(11, 15, 25, 0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 21,
          lineHeight: 1.4,
          fontWeight: 500,
          opacity,
        }}
      >
        {current.caption}
      </div>
    </AbsoluteFill>
  )
}
