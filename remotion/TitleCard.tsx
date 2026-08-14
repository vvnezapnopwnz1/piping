import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"

export function TitleCard({ title, subtitle }: { title: string; subtitle?: string }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" })
  const translateY = interpolate(frame, [0, 15], [16, 0], { extrapolateRight: "clamp" })

  return (
    <AbsoluteFill
      style={{
        background: "#0b0d10",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          PQ
        </div>
        <span style={{ fontSize: 22, fontWeight: 600, color: "#9ca3af" }}>PipeQC</span>
      </div>
      <h1 style={{ fontSize: 48, fontWeight: 700, margin: 0, textAlign: "center" }}>{title}</h1>
      {subtitle ? (
        <p style={{ fontSize: 20, color: "#9ca3af", marginTop: 12, textAlign: "center", maxWidth: 800 }}>
          {subtitle}
        </p>
      ) : null}
    </AbsoluteFill>
  )
}
