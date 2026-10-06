"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

import { isCommitLabel, isTrackedField } from "./unsaved-input"

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

const valueOf = (field: Field) =>
  field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")
    ? String(field.checked)
    : field.value

/**
 * Asks before a link leaves a page whose form holds input that was typed but not recorded.
 * Search boxes and table filters do not count: they live in the address bar and survive.
 * A field counts while it is on screen and differs from what it held when the user started
 * typing; pressing a Record / Save / Issue command takes that as the new baseline.
 */
type Pending = { href: string } | { proceed: () => void }

type DirtySource = () => boolean
const DirtySourceContext = React.createContext<(source: DirtySource) => () => void>(() => () => {})

export function useRegisterUnsavedState(dirty: boolean) {
  const register = React.useContext(DirtySourceContext)
  const current = React.useRef(dirty)
  React.useEffect(() => {
    current.current = dirty
  }, [dirty])
  React.useEffect(() => register(() => current.current), [register])
}

const GuardContext = React.createContext<(proceed: () => void) => void>((proceed) => proceed())
const RecordedContext = React.createContext<(fields: readonly HTMLElement[]) => void>(() => {})

export function useMarkInputsRecorded() {
  return React.useContext(RecordedContext)
}

/**
 * For a change that is not a link — choosing another record, closing a panel — on a page that
 * may hold unrecorded input: runs `proceed` at once when nothing is unsaved, otherwise after the
 * user confirms leaving it.
 */
export function useRequestLeave(): (proceed: () => void) => void {
  return React.useContext(GuardContext)
}

export function UnsavedInputGuard({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const projectId = useSupabaseAuth().access?.projectId ?? null
  const baseline = React.useRef(new Map<Field, string>())
  const dirtySources = React.useRef(new Set<DirtySource>())
  const [pending, setPending] = React.useState<Pending | null>(null)

  const registerDirtySource = React.useCallback((source: DirtySource) => {
    dirtySources.current.add(source)
    return () => {
      dirtySources.current.delete(source)
    }
  }, [])

  const isDirty = React.useCallback(() => {
    for (const source of dirtySources.current) {
      if (source()) return true
    }
    for (const [field, initial] of baseline.current) {
      if (!field.isConnected) baseline.current.delete(field)
      else if (valueOf(field) !== initial) return true
    }
    return false
  }, [])

  // A new page or project starts clean; whatever was typed before has already been left.
  React.useEffect(() => {
    baseline.current.clear()
    dirtySources.current.clear()
  }, [pathname, projectId])

  React.useEffect(() => {
    const main = () => document.getElementById("main-content")

    const remember = (event: Event) => {
      const field = event.target
      if (
        !(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) ||
        !main()?.contains(field) ||
        !isTrackedField(field) ||
        baseline.current.has(field)
      )
        return
      // The value before this keystroke: focus is where typing starts, so read it there.
      baseline.current.set(field, field.dataset.unsavedInitial ?? "")
    }

    const onFocus = (event: FocusEvent) => {
      const field = event.target
      if (
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) &&
        !baseline.current.has(field)
      ) {
        field.dataset.unsavedInitial = valueOf(field)
      }
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return

      const command = target.closest("button")
      if (command && main()?.contains(command) && isCommitLabel(command.textContent ?? "")) {
        if (command.closest('[data-explicit-unsaved-commit="true"]')) return
        // Re-baseline after the command has had a chance to run.
        window.setTimeout(() => {
          for (const field of baseline.current.keys()) baseline.current.set(field, valueOf(field))
        }, 0)
        return
      }

      const link = target.closest("a[href]")
      if (!(link instanceof HTMLAnchorElement)) return
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (link.target && link.target !== "_self") return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!isDirty()) return
      event.preventDefault()
      event.stopPropagation()
      setPending({ href: `${url.pathname}${url.search}${url.hash}` })
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty()) return
      event.preventDefault()
    }

    document.addEventListener("focusin", onFocus, true)
    document.addEventListener("input", remember, true)
    document.addEventListener("change", remember, true)
    document.addEventListener("click", onClick, true)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      document.removeEventListener("focusin", onFocus, true)
      document.removeEventListener("input", remember, true)
      document.removeEventListener("change", remember, true)
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [isDirty])

  const markRecorded = React.useCallback((fields: readonly HTMLElement[]) => {
    for (const field of fields) {
      if (
        !(
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLSelectElement
        )
      )
        continue
      if (baseline.current.has(field)) baseline.current.set(field, valueOf(field))
    }
  }, [])

  const requestLeave = React.useCallback(
    (proceed: () => void) => {
      if (isDirty()) setPending({ proceed })
      else proceed()
    },
    [isDirty],
  )

  return (
    <RecordedContext.Provider value={markRecorded}>
      <GuardContext.Provider value={requestLeave}>
        <DirtySourceContext.Provider value={registerDirtySource}>
          {children}
        </DirtySourceContext.Provider>
        <AlertDialog open={pending !== null} onOpenChange={(open) => (open ? null : setPending(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without recording?</AlertDialogTitle>
            <AlertDialogDescription>
              This page has input that has not been recorded yet. Leaving discards it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on this page</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = pending
                baseline.current.clear()
                dirtySources.current.clear()
                setPending(null)
                if (!action) return
                if ("href" in action) router.push(action.href)
                else action.proceed()
              }}
            >
              Leave and discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </GuardContext.Provider>
    </RecordedContext.Provider>
  )
}
