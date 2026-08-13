'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * The name of the thing being worked on, said loudly.
 *
 * Both places this replaces said it in `text-xs` next to a label: the collapsed spool bar, where
 * it is the only remaining trace of a choice made out of thousands, and the form heading, where it
 * is the difference between recording a weld against W-001 and against W-002. Neither is a caption
 * — on these screens the identity *is* the heading, so it is set like one.
 */
export function IdentityHeadline({
  kind,
  identity,
  meta,
  status,
  action,
  className,
}: {
  /** What sort of record this is — "Spool", "Weld joint", "Flange". */
  kind: string
  /** The number the operator recognises. Set in mono, because that is what makes it scannable. */
  identity: React.ReactNode
  /** Revision, parent ISO, anything that disambiguates without competing. */
  meta?: React.ReactNode
  status?: React.ReactNode
  /** Right-hand slot, typically the control that reopens the list. */
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          {kind}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xl leading-tight font-bold tracking-tight sm:text-2xl">
            {identity}
          </span>
          {status}
        </div>
        {meta ? <p className="text-muted-foreground mt-0.5 truncate text-sm">{meta}</p> : null}
      </div>
      {action}
    </div>
  )
}

/**
 * Marks the moment the form underneath changed which record it edits.
 *
 * Clicking a different joint used to change one word in a heading and nothing else — the fields
 * kept their shape and their position, so an operator who had already started typing had no reason
 * to believe anything had moved. On a screen that writes weld evidence, "I did not notice I had
 * switched rows" is a wrong record, not a nuisance.
 *
 * Four signals, because no single one reaches everyone and no single one survives every situation:
 * the card flashes and holds an accent ring for a moment (seen), the form is brought into view if
 * the click happened with it below the fold (seen at all), the headline above states the new
 * target in full (read), and the change is announced politely (heard).
 *
 * The flash is decorative and lives in its own remounting overlay, so it replays on every change
 * without touching the form's own state, focus or scroll position. `prefers-reduced-motion` drops
 * the animation and the smooth scroll, leaving the headline and the announcement to carry it.
 */
export function ChangeHighlight({
  id,
  announce,
  children,
  className,
}: {
  /** Identity of the record being edited. A change to this is what triggers the signal. */
  id: string | null | undefined
  /** What a screen reader should hear, e.g. "Now recording weld W-002". */
  announce: string
  children: React.ReactNode
  className?: string
}) {
  // What is drawn comes from state, never from a ref: the flash counter is read during render,
  // so it cannot be the same value the effect compares against.
  const [flashCount, setFlashCount] = React.useState(0)
  const shownId = React.useRef(id)
  const container = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    // On mount these are equal, and the form appearing is a change nobody can miss — spending the
    // signal there would only teach the operator to ignore it.
    if (shownId.current === id) return
    shownId.current = id
    if (!id) return

    setFlashCount((count) => count + 1)

    // The joint list stays open above the form, so on a long worklist the form the operator just
    // retargeted can be entirely below the fold — where a flash is a signal nobody sees. Only
    // scroll when it actually is out of the way: dragging the page under someone who can already
    // see the form is worse than doing nothing.
    const element = container.current
    if (!element) return
    const box = element.getBoundingClientRect()
    const offScreen = box.top > window.innerHeight - 120 || box.bottom < 120
    if (!offScreen) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
  }, [id])

  return (
    <div ref={container} className={cn('relative', className)}>
      {children}
      {flashCount > 0 ? (
        <span
          // Remounting on every change is what replays the animation; a class toggle would need
          // a reflow to restart and would miss two clicks in quick succession.
          key={flashCount}
          aria-hidden="true"
          className="animate-record-target-change pointer-events-none absolute inset-0 rounded-xl"
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}
