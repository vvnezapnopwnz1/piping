import type { TimelineEvent } from "./timeline-types"

/** How far ahead of an event's tMs the cursor/camera starts moving toward it. */
export const APPROACH_MS = 350
/** Ken Burns zoom level when the camera is pushed in on an active element. */
export const MAX_SCALE = 1.32

export function easeInOutCubic(t: number) {
  const c = Math.min(1, Math.max(0, t))
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function boxCenter(box: NonNullable<TimelineEvent["box"]>) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export type CursorVisual = {
  x: number
  y: number
  opacity: number
  rippleProgress: number
}

/**
 * Where the synthetic cursor sits at `elapsedMs`. Slides between consecutive
 * click/type targets; fades out rather than sliding across a page navigation
 * (the old position is meaningless once the page underneath has changed),
 * then fades back in once the next target's approach window begins.
 */
export function getCursorVisual(events: TimelineEvent[], elapsedMs: number): CursorVisual {
  let prevBox: TimelineEvent | null = null
  let nextBox: TimelineEvent | null = null
  let blockedByNavigate = false

  for (const e of events) {
    if (e.tMs <= elapsedMs) {
      if (e.box) {
        prevBox = e
        blockedByNavigate = false
      } else if (e.type === "navigate") {
        blockedByNavigate = true
      }
    } else if (e.box && nextBox === null) {
      nextBox = e
    }
  }

  if (nextBox && elapsedMs >= nextBox.tMs - APPROACH_MS) {
    const t = easeInOutCubic((elapsedMs - (nextBox.tMs - APPROACH_MS)) / APPROACH_MS)
    const target = boxCenter(nextBox.box!)
    if (prevBox && !blockedByNavigate) {
      const from = boxCenter(prevBox.box!)
      return { x: lerp(from.x, target.x, t), y: lerp(from.y, target.y, t), opacity: 1, rippleProgress: 0 }
    }
    return { x: target.x, y: target.y, opacity: t, rippleProgress: 0 }
  }

  if (prevBox && !blockedByNavigate) {
    const center = boxCenter(prevBox.box!)
    const rippleElapsed = elapsedMs - prevBox.tMs
    const rippleProgress =
      prevBox.type === "click" && rippleElapsed >= 0 && rippleElapsed <= 450 ? rippleElapsed / 450 : 0
    return { x: center.x, y: center.y, opacity: 1, rippleProgress }
  }

  return { x: 0, y: 0, opacity: 0, rippleProgress: 0 }
}

export type CameraKeyframe = {
  tMs: number
  scale: number
  originXPct: number
  originYPct: number
}

/**
 * A unified camera timeline: push in on every click/type target, pull back
 * to the full frame on every navigation. `interpolateCamera` then eases
 * between whichever two keyframes straddle the current time.
 */
export function buildCameraKeyframes(events: TimelineEvent[], width: number, height: number): CameraKeyframe[] {
  const keyframes: CameraKeyframe[] = [{ tMs: 0, scale: 1, originXPct: 50, originYPct: 50 }]
  for (const e of events) {
    if (e.box) {
      const center = boxCenter(e.box)
      keyframes.push({
        tMs: e.tMs,
        scale: MAX_SCALE,
        originXPct: (center.x / width) * 100,
        originYPct: (center.y / height) * 100,
      })
    } else if (e.type === "navigate") {
      keyframes.push({ tMs: e.tMs, scale: 1, originXPct: 50, originYPct: 50 })
    }
  }
  return keyframes
}

export function interpolateCamera(keyframes: CameraKeyframe[], elapsedMs: number): CameraKeyframe {
  let idx = 0
  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].tMs <= elapsedMs) idx = i
    else break
  }
  const current = keyframes[idx]
  const next = keyframes[idx + 1]
  if (!next) return current

  const approachStart = next.tMs - APPROACH_MS
  if (elapsedMs < approachStart) return current

  const t = easeInOutCubic((elapsedMs - approachStart) / APPROACH_MS)
  return {
    tMs: elapsedMs,
    scale: lerp(current.scale, next.scale, t),
    originXPct: lerp(current.originXPct, next.originXPct, t),
    originYPct: lerp(current.originYPct, next.originYPct, t),
  }
}
