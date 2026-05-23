"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/**
 * Notifications store — drives the home page banner and notification feed.
 *
 * There are TWO kinds of notifications here:
 *
 * 1. "Computed" notifications — derived live from welds + batches stores.
 *    These don't live in this store. Use `useComputedNotifications()` hook.
 *    Example: "BTH-2025-0153 is overdue by 7 days".
 *
 * 2. "Manual" notifications — explicit announcements added by the user via
 *    `pushNotification()`. Stored here in localStorage. Used for demo flow
 *    moments like "Just now: Bureau Veritas accepted your batch".
 *
 * Together they create a believable feed for the home page hero.
 */

export type NotificationSeverity = "info" | "warning" | "error" | "success"

export type NotificationCategory =
  | "weld_progress"
  | "nde_overdue"
  | "nde_result"
  | "rework"
  | "tracking"
  | "erection"
  | "testpack"
  | "system"

export interface NotificationAck {
  actor: string
  at: string
}

export interface Notification {
  id: string
  severity: NotificationSeverity
  category: NotificationCategory
  title: string
  description: string
  href?: string // target page in the app
  timestamp: string // ISO
  read: boolean
  actorLabel?: string // e.g. "Bureau Veritas" — shown as source/badge
  acknowledged?: NotificationAck
  archived?: boolean
}

interface NotificationsState {
  notifications: Notification[]

  pushNotification: (
    n: Omit<Notification, "id" | "timestamp" | "read"> & { timestamp?: string }
  ) => Notification
  markRead: (id: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
  acknowledge: (id: string, actor: string) => void
  unacknowledge: (id: string) => void
  archive: (id: string) => void
  unarchive: (id: string) => void
  clearAll: () => void
  resetDemo: () => void
  hydrateDemoScenario: () => void

  getUnreadCount: () => number
}

const now = new Date()
const minutesAgo = (n: number) =>
  new Date(now.getTime() - n * 60 * 1000).toISOString()
const hoursAgo = (n: number) =>
  new Date(now.getTime() - n * 60 * 60 * 1000).toISOString()
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n-001",
    severity: "error",
    category: "nde_result",
    title: "BTH-2025-0156: 1 weld rejected — TP-205 blocked",
    description:
      "J-1028 (PL-FU300-007-A) · TP-205 — Undercut on external bead, depth 1.2mm. Awaiting disposition.",
    href: "/nde",
    timestamp: hoursAgo(2),
    read: false,
    actorLabel: "NDE-INS-04",
  },
  {
    id: "n-002",
    severity: "warning",
    category: "nde_overdue",
    title: "BTH-2025-0153 overdue by 7 days",
    description:
      "3 welds issued to SGS Industrial. No results received. Consider escalation to NDE coordinator.",
    href: "/nde",
    timestamp: hoursAgo(4),
    read: false,
    actorLabel: "SGS Industrial",
  },
  {
    id: "n-003",
    severity: "warning",
    category: "tracking",
    title: "2 spool inconsistencies detected",
    description:
      "PL-CW200-004-A and PL-FU300-008-B status doesn't match scanned location. Review tracking module.",
    href: "/tracking",
    timestamp: hoursAgo(5),
    read: false,
  },
  {
    id: "n-004",
    severity: "info",
    category: "weld_progress",
    title: "3 spools awaiting weld progress entry",
    description:
      "PL-CW200-008-A, PL-FU300-009-A, PL-FU300-011-A — fit-up complete. Welding can begin.",
    href: "/fabrication/weld-progress",
    timestamp: hoursAgo(8),
    read: false,
    actorLabel: "QC Engineer",
  },
  {
    id: "n-005",
    severity: "success",
    category: "nde_result",
    title: "BTH-2025-0148: closed clean",
    description:
      "All 4 welds accepted by Bureau Veritas. Batch ready for close-out.",
    href: "/nde",
    timestamp: daysAgo(1),
    read: true,
    actorLabel: "Bureau Veritas",
  },
  {
    id: "n-006",
    severity: "info",
    category: "system",
    title: "Welder qualification expiring",
    description:
      "WLD-019 qualification for SMAW-P1 expires in 14 days. Renewal required.",
    href: "/admin",
    timestamp: daysAgo(2),
    read: true,
  },
  {
    id: "n-007",
    severity: "info",
    category: "testpack",
    title: "TP-205: 5 ISOs ready for line check",
    description:
      "Test pack TP-205 (Cooling Tower CT-01) has 5 ISOs eligible for line check. Assign to a checker team.",
    href: "/testpack/pressure-test",
    timestamp: daysAgo(1),
    read: false,
  },
]

const NOTIFICATION_ID_RE = /^n-(\d+)$/

function dedupeNotificationsById(
  notifications: Notification[],
): Notification[] {
  const seen = new Set<string>()
  return notifications.filter((n) => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
}

function migrateNotification(n: Notification): Notification {
  return {
    ...n,
    archived: n.archived ?? false,
    acknowledged: n.acknowledged,
  }
}

/** Next id from existing list — survives persist rehydrate (module counter does not). */
function allocNotificationId(notifications: Notification[]): string {
  let max = INITIAL_NOTIFICATIONS.length
  for (const n of notifications) {
    const m = NOTIFICATION_ID_RE.exec(n.id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `n-${String(max + 1).padStart(3, "0")}`
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: INITIAL_NOTIFICATIONS,

      pushNotification: (n) => {
        let notification!: Notification
        set((state) => {
          const id = allocNotificationId(state.notifications)
          notification = {
            id,
            timestamp: n.timestamp ?? new Date().toISOString(),
            read: false,
            archived: false,
            ...n,
          }
          const rest = state.notifications.filter((item) => item.id !== id)
          return {
            notifications: dedupeNotificationsById([
              notification,
              ...rest,
            ]),
          }
        })
        return notification
      },

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      dismiss: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      acknowledge: (id, actor) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id
              ? {
                  ...n,
                  read: true,
                  acknowledged: { actor, at: new Date().toISOString() },
                }
              : n
          ),
        })),

      unacknowledge: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, acknowledged: undefined } : n
          ),
        })),

      archive: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, archived: true, read: true } : n
          ),
        })),

      unarchive: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, archived: false } : n
          ),
        })),

      clearAll: () => set({ notifications: [] }),

      resetDemo: () => set({ notifications: INITIAL_NOTIFICATIONS }),

      hydrateDemoScenario: () =>
        set({ notifications: INITIAL_NOTIFICATIONS }),

      getUnreadCount: () =>
        get().notifications.filter((n) => !n.read && !n.archived).length,
    }),
    {
      name: "pipeqc-notifications",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as { notifications?: Notification[] }
        if (!state?.notifications) return persisted as NotificationsState
        if (version < 2) {
          state.notifications = dedupeNotificationsById(state.notifications)
        }
        if (version < 3) {
          state.notifications = state.notifications.map(migrateNotification)
        }
        return state as NotificationsState
      },
    }
  )
)

// ---------------------------------------------------------------------------
// Convenience hooks
// ---------------------------------------------------------------------------

export const useUnreadNotifications = () => {
  const notifications = useNotificationsStore((s) => s.notifications)
  return dedupeNotificationsById(notifications).filter(
    (n) => !n.read && !n.archived
  )
}

export const useNotificationsCount = () => {
  return useNotificationsStore((s) => s.getUnreadCount())
}
