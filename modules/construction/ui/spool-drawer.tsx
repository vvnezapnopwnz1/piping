"use client"
 
import { useEffect, useId, useRef, type ReactNode } from "react"
import { Check } from "lucide-react"

import { RecordDrawer } from "@/components/ui/record-drawer"
import { timelineLines } from "./timeline-lines"
import styles from "./spool-workbench.module.css"

/**
 * A right-hand overlay, like the large ROMS drawer. The table keeps its full layout underneath,
 * while the selected spool's process and operation occupy a full-height sheet above the page.
 */
export function SpoolDrawer({
  kicker,
  title,
  meta,
  status,
  onClose,
  children,
}: {
  kicker: string
  title: string
  meta: string
  status?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  return (
    <RecordDrawer
      kicker={kicker}
      title={title}
      meta={meta}
      status={status}
      returnLabel="Spools"
      closeLabel={`Close spool ${title}`}
      recordKind="spool"
      onClose={onClose}
    >
      {children}
    </RecordDrawer>
  )
}

export interface TimelineStep {
  id: string
  title: string
  state: "done" | "next" | "later"
  lines: { label: string; value: string | null }[]
  locked?: boolean
  completedLabel?: string
  stateLabel?: string
}

/**
 * A persistent process beside the operation, so a long form never pushes later stages away.
 * These are the spool's actual stages, grouped by the operation that records them.
 */
export function SpoolTimeline({
  label,
  steps,
  active,
  onOpen,
  processTitle = "Fabrication process",
  children,
}: {
  label: string
  steps: readonly TimelineStep[]
  active: string
  onOpen: (id: string) => void
  processTitle?: string
  /** The open step's operation. */
  children: ReactNode
}) {
  const panelId = useId()
  const current = steps.find((step) => step.id === active)
  const operation = useRef<HTMLDivElement>(null)
  useEffect(() => {
    operation.current?.scrollTo({ top: 0 })
  }, [active])

  return (
    <div className={styles.processLayout}>
    <nav className={styles.processNav} aria-label={label} data-help="spool-stepper">
    <p className={styles.processLabel}>{processTitle}</p>
    <ol className={styles.timeline}>
      {steps.map((step) => {
        const open = step.id === active
        const visibleLines = timelineLines(step.title, step.lines)
        const singleDate = visibleLines.length === 0 && step.lines.length === 1 ? step.lines[0]?.value : null
        return (
          <li key={step.id} className={styles.tStep} data-state={step.state} data-open={open ? "" : undefined}>
            <div className={styles.tMain}>
              <button
                type="button"
                className={styles.tHead}
                aria-current={open ? "step" : undefined}
                aria-controls={panelId}
                disabled={step.locked}
                onClick={() => (open ? undefined : onOpen(step.id))}
              >
                <span className={styles.tDot} aria-hidden="true">{step.state === "done" ? <Check /> : null}</span>
                <span className={styles.tHeadContent}>
                <span className={styles.tTitleRow}>
                  <span className={styles.tTitle}>{step.title}</span>
                  {singleDate ? <span className={styles.stageDate}>{singleDate}</span> : null}
                  {step.state === "done" ? (
                    <span className={styles.tDone}>{step.completedLabel ?? "Recorded"}</span>
                  ) : step.state === "next" ? (
                    <span className={styles.nextBadge}>Next</span>
                  ) : null}
                  {step.locked ? <span className={styles.tLocked}>Not in your access</span> : null}
                </span>
                {visibleLines.length > 0 ? (
                  <span className={styles.tLines}>
                    {visibleLines.map((line) => (
                      <span key={line.label} data-recorded={line.value ? "" : undefined}>
                        {line.label} <span className={styles.stageDate}>{line.value ?? "—"}</span>
                      </span>
                    ))}
                  </span>
                ) : null}
                </span>
              </button>
            </div>
          </li>
        )
      })}
    </ol>
    </nav>
    <section id={panelId} className={styles.operationPane} aria-labelledby={`${panelId}-title`}>
      <header className={styles.operationHead}>
        <h3 id={`${panelId}-title`} className={styles.operationTitle}>{current?.title}</h3>
      </header>
      <div ref={operation} className={styles.operationScroll} data-operation-scroll="" tabIndex={0} aria-label={`${current?.title} operation`}>
        {children}
      </div>
    </section>
    </div>
  )
}
