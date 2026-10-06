"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { ArrowLeft, Maximize2, Minimize2, X } from "lucide-react"

import styles from "./record-drawer.module.css"

const mobileQuery = "(max-width: 1023px)"
const subscribeMobile = (callback: () => void) => {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener("change", callback)
  return () => query.removeEventListener("change", callback)
}

export interface RecordDrawerProps {
  kicker: string
  title: string
  meta: string
  status?: ReactNode
  returnLabel: string
  closeLabel: string
  recordKind: "spool" | "test-pack"
  onClose: () => void
  children: ReactNode
}

/**
 * A neutral right-hand overlay drawer for records (Spool, Test Pack).
 * The table keeps its full layout underneath, while the selected record
 * occupies a full-height sheet above the page.
 */
export function RecordDrawer({
  kicker,
  title,
  meta,
  status,
  returnLabel,
  closeLabel,
  recordKind,
  onClose,
  children,
}: RecordDrawerProps) {
  const headingId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const panel = useRef<HTMLElement>(null)
  const [expanded, setExpanded] = useState(false)
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  )

  useEffect(() => {
    const previous = document.activeElement
    heading.current?.focus({ preventScroll: true })
    panel.current?.querySelector("[data-operation-scroll]")?.scrollTo({ top: 0 })
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true })
      }
    }
  }, [title])

  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      root.style.overflow = previous
    }
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.stopPropagation()
      onClose()
    }
    if (event.key === "Tab") {
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === heading.current)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  const kindAttrs =
    recordKind === "spool"
      ? { "data-spool-drawer": "" }
      : { "data-test-pack-drawer": "" }

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} aria-hidden="true" />
      <section
        ref={panel}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={onKeyDown}
        data-record-drawer=""
        {...kindAttrs}
        data-expanded={expanded ? "" : undefined}
      >
        <header className={styles.drawerHead}>
          <button type="button" className={styles.drawerBack} onClick={onClose}>
            <ArrowLeft aria-hidden="true" />
            {returnLabel}
          </button>
          <div className={styles.drawerIdent}>
            <p className={styles.drawerKicker}>{kicker}</p>
            <h2 id={headingId} ref={heading} tabIndex={-1} className={styles.drawerTitle}>
              {title}
            </h2>
            <p className={styles.drawerMeta}>{meta}</p>
          </div>
          {status ? <div className={styles.drawerStatus}>{status}</div> : null}
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Restore drawer size" : "Expand drawer"}
            title={expanded ? "Restore size" : "Expand"}
            aria-pressed={expanded}
            hidden={mobile}
          >
            {expanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </button>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className={styles.drawerBody}>{children}</div>
      </section>
    </>
  )
}
