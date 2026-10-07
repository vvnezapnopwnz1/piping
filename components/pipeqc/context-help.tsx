"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { usePathname } from "next/navigation"
import { CircleHelp } from "lucide-react"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

import {
  DEFAULT_HELP_PREFERENCES,
  helpHintsFor,
  helpStorageKey,
  parseHelpPreferences,
  placeCoach,
  type HelpHint,
  type HelpPreferences,
} from "./help-registry"
import styles from "./workbench-shell.module.css"

interface HelpValue {
  open: boolean
  hint: HelpHint | null
  /** A hint exists for this page and the user has not opened it or turned suggestions off. */
  suggest: boolean
  toggle: () => void
  close: (restoreFocus: boolean) => void
  never: () => void
}

const HelpContext = React.createContext<HelpValue | null>(null)

function visibleTarget(target: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-help="${target}"]`)
  for (const node of nodes) if (node.getClientRects().length > 0) return node
  return null
}

function readPreferences(key: string | null): HelpPreferences {
  if (!key) return DEFAULT_HELP_PREFERENCES
  try {
    return parseHelpPreferences(window.localStorage.getItem(key))
  } catch {
    return DEFAULT_HELP_PREFERENCES
  }
}

function writePreferences(key: string | null, value: HelpPreferences) {
  if (!key) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // A preference only; help keeps working without storage.
  }
}

/**
 * On-request help: one non-modal coach mark next to a real control at a time. It never runs a
 * command, fills a field or re-renders the page under it, so an open hint cannot touch unsaved
 * input. Changing page or project closes it.
 */
export function HelpProvider({ children }: { children: React.ReactNode }) {
  const { user, access } = useSupabaseAuth()
  const pathname = usePathname()
  const storageKey = user ? helpStorageKey(user.id) : null
  // The shell renders only in the browser, after sign-in, so storage can be read while rendering;
  // a different user simply reads their own key.
  const [prefs, setPrefs] = React.useState(() => ({ key: storageKey, value: readPreferences(storageKey) }))
  const preferences = prefs.key === storageKey ? prefs.value : readPreferences(storageKey)
  const [state, setState] = React.useState<{ hint: HelpHint; path: string; project: string | null } | null>(null)
  const project = access?.projectId ?? null
  const open = state !== null && state.path === pathname && state.project === project

  const update = React.useCallback(
    (change: (current: HelpPreferences) => HelpPreferences) => {
      const value = change(preferences)
      writePreferences(storageKey, value)
      setPrefs({ key: storageKey, value })
    },
    [preferences, storageKey],
  )

  const close = React.useCallback((restoreFocus: boolean) => {
    setState(null)
    if (restoreFocus) document.querySelector<HTMLElement>("[data-help-button]")?.focus({ preventScroll: true })
  }, [])

  const toggle = React.useCallback(() => {
    if (open) {
      close(true)
      return
    }
    const hint = helpHintsFor(pathname).find((candidate) => visibleTarget(candidate.target))
    if (!hint) return
    setState({ hint, path: pathname, project })
    update((current) =>
      current.seen.includes(pathname) ? current : { ...current, seen: [...current.seen, pathname] },
    )
  }, [close, open, pathname, project, update])

  const never = React.useCallback(() => {
    update((current) => ({ ...current, suppress: true }))
    close(true)
  }, [close, update])

  const [hasHint, setHasHint] = React.useState(false)
  React.useEffect(() => {
    // Targets render after data loads, so look again shortly after the page settles.
    const check = () => setHasHint(helpHintsFor(pathname).some((hint) => visibleTarget(hint.target)))
    check()
    const timer = window.setTimeout(check, 1200)
    return () => window.clearTimeout(timer)
  }, [pathname, project])

  const closeAndRestore = React.useCallback(() => close(true), [close])
  const suggest = hasHint && !preferences.suppress && !preferences.seen.includes(pathname)
  const value = React.useMemo<HelpValue>(
    () => ({ open, hint: open ? state!.hint : null, suggest, toggle, close, never }),
    [close, never, open, state, suggest, toggle],
  )

  return (
    <HelpContext.Provider value={value}>
      {children}
      {open ? <CoachMark hint={state!.hint} onClose={closeAndRestore} onNever={never} /> : null}
    </HelpContext.Provider>
  )
}

export function HelpButton({ className }: { className?: string }) {
  const ts = useTranslations("shell.help")
  const help = React.useContext(HelpContext)
  if (!help) return null
  return (
    <button
      type="button"
      data-help-button=""
      className={className}
      aria-expanded={help.open}
      aria-controls={help.open ? "pipeqc-coach" : undefined}
      onClick={help.toggle}
    >
      <CircleHelp aria-hidden="true" />
      <span className={styles.hideNarrow}>{ts("button")}</span>
      {help.suggest ? (
        <>
          <span className={styles.helpDot} aria-hidden="true" />
          <span className="sr-only">{ts("hintAvailable")}</span>
        </>
      ) : null}
    </button>
  )
}

function CoachMark({
  hint,
  onClose,
  onNever,
}: {
  hint: HelpHint
  onClose: () => void
  onNever: () => void
}) {
  const t = useTranslations("help")
  const ts = useTranslations("shell.help")
  const tc = useTranslations("common.actions")
  const ref = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const [placement, setPlacement] = React.useState<ReturnType<typeof placeCoach> | null>(null)

  React.useLayoutEffect(() => {
    const target = visibleTarget(hint.target)
    if (!target) {
      onClose()
      return
    }
    target.setAttribute("data-help-active", "")
    const header = document.querySelector<HTMLElement>("[data-identity-bar]")
    const rect = target.getBoundingClientRect()
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0
    if (rect.top < headerBottom + 8 || rect.bottom > window.innerHeight - 8) {
      target.scrollIntoView({ block: "center" })
    }
    let frame = 0
    const place = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const coach = ref.current
        if (!coach || !target.isConnected) return
        setPlacement(
          placeCoach({
            target: target.getBoundingClientRect(),
            coach: { width: coach.offsetWidth, height: coach.offsetHeight },
            viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
            headerBottom: header?.getBoundingClientRect().bottom ?? 0,
          }),
        )
      })
    }
    place()
    closeRef.current?.focus({ preventScroll: true })
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(frame)
      target.removeAttribute("data-help-active")
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [hint.target, onClose])

  return (
    <div
      ref={ref}
      id="pipeqc-coach"
      role="dialog"
      aria-modal="false"
      aria-labelledby="pipeqc-coach-title"
      aria-describedby="pipeqc-coach-body"
      className={styles.coach}
      data-place={placement?.place ?? "below"}
      style={{
        left: placement?.left ?? 8,
        top: placement?.top ?? 64,
        visibility: placement ? "visible" : "hidden",
      }}
    >
      <span className={styles.coachCaret} style={{ left: placement?.caretLeft ?? 20 }} aria-hidden="true" />
      <h2 id="pipeqc-coach-title" className={styles.coachTitle}>
        {t(`${hint.key}.title`)}
      </h2>
      <p id="pipeqc-coach-body" className={styles.coachBody}>
        {t(`${hint.key}.body`)}
      </p>
      <div className={styles.coachActions}>
        <button ref={closeRef} type="button" className={styles.coachClose} onClick={onClose}>
          {tc("close")}
        </button>
        <button type="button" className={styles.coachNever} onClick={onNever}>
          {ts("never")}
        </button>
      </div>
    </div>
  )
}
