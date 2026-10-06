import type { ReactNode } from "react"
import { AbsoluteFill } from "remotion"

import type { TimelineEvent } from "./timeline-types"

export function KenBurns({
  children,
}: {
  events?: TimelineEvent[]
  width?: number
  height?: number
  children: ReactNode
}) {
  return (
    <AbsoluteFill
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </AbsoluteFill>
  )
}
