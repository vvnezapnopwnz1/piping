/**
 * The five states a PipeQC record can be in, as far as the eye is concerned. Screens speak in
 * domain words — `accepted`, `rft`, `escalated`, `not_started` — and each of them has to land on
 * one of these before it can be painted.
 *
 * Kept apart from the component so the mapping can be tested without a renderer, and so a screen
 * can ask for the tone of a status without importing JSX.
 */
export type StatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

const TONE_BY_STATUS: Record<string, StatusTone> = {
  // Settled, nothing left to do.
  accepted: 'success',
  active: 'success',
  approved: 'success',
  cleared: 'success',
  complete: 'success',
  completed: 'success',
  done: 'success',
  passed: 'success',
  ready: 'success',
  released: 'success',
  rft: 'success',

  // Someone has to act, but nothing is wrong yet.
  blocked: 'warning',
  inactive: 'warning',
  on_hold: 'warning',
  pending: 'warning',
  waiting: 'warning',

  // Under way. Distinct from `warning`, because "being worked on" is not "needs attention".
  allocated: 'info',
  in_progress: 'info',
  issued: 'info',
  open: 'info',
  partial: 'info',
  submitted: 'info',

  // Went wrong. Reads as loud as the delete button, and it should.
  cancelled: 'danger',
  escalated: 'danger',
  expired: 'danger',
  failed: 'danger',
  overdue: 'danger',
  rejected: 'danger',

  // Exists, means nothing on its own.
  archived: 'neutral',
  draft: 'neutral',
  not_applicable: 'neutral',
  not_started: 'neutral',
  superseded: 'neutral',
  unknown: 'neutral',
}

/**
 * `not started`, `NOT_STARTED` and `not-started` all come out of the database somewhere in the
 * app, so they are folded together rather than listed three times.
 */
export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return 'neutral'
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return TONE_BY_STATUS[key] ?? 'neutral'
}

/** `not_started` -> `Not started`. Screens should never print a raw enum at the operator. */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown'
  const words = status.trim().replace(/[\s_-]+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase()
}
