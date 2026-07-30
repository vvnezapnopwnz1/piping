"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  UserCheck,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  useNotificationsStore,
  type Notification,
  type NotificationSeverity,
} from "@/store/notifications-store"

const severityConfig = {
  error: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
} as const

type FeedFilter = "all" | "errors" | "warnings" | "info" | "archived"

function matchesFilter(n: Notification, filter: FeedFilter): boolean {
  if (filter === "archived") return n.archived === true
  if (n.archived) return false
  if (filter === "all") return true
  if (filter === "errors") return n.severity === "error"
  if (filter === "warnings") return n.severity === "warning"
  if (filter === "info")
    return n.severity === "info" || n.severity === "success"
  return true
}

type FeedItem =
  | { kind: "single"; notification: Notification }
  | {
      kind: "group"
      severity: NotificationSeverity
      notifications: Notification[]
    }

function buildFeedItems(notifications: Notification[]): FeedItem[] {
  const items: FeedItem[] = []
  let i = 0
  while (i < notifications.length) {
    const n = notifications[i]
    if (
      (n.severity === "error" || n.severity === "warning") &&
      !n.archived
    ) {
      const run: Notification[] = [n]
      let j = i + 1
      while (
        j < notifications.length &&
        notifications[j].severity === n.severity &&
        !notifications[j].archived
      ) {
        run.push(notifications[j])
        j++
      }
      if (run.length >= 3) {
        items.push({ kind: "group", severity: n.severity, notifications: run })
        i = j
        continue
      }
    }
    items.push({ kind: "single", notification: n })
    i++
  }
  return items
}

function NotificationRow({
  notification: n,
  onAcknowledge,
  onArchive,
}: {
  notification: Notification
  onAcknowledge: (id: string) => void
  onArchive: (id: string) => void
}) {
  const config = severityConfig[n.severity]
  const Icon = config.icon

  const body = (
  <>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{n.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{n.description}</p>
        {n.acknowledged ? (
          <p className="mt-1.5 text-xs text-slate-600">
            <UserCheck className="mr-1 inline h-3 w-3" />
            Acknowledged by {n.acknowledged.actor.replace(/_/g, " ")} ·{" "}
            {formatDistanceToNow(new Date(n.acknowledged.at), {
              addSuffix: true,
            })}
          </p>
        ) : null}
        <p className="mt-1 text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {n.actorLabel ? (
          <Badge variant="outline" className="text-xs">
            {n.actorLabel}
          </Badge>
        ) : null}
        <div className="flex gap-1">
          {!n.acknowledged && !n.archived ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAcknowledge(n.id)
              }}
            >
              Acknowledge
            </Button>
          ) : null}
          {!n.archived ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[10px]"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onArchive(n.id)
              }}
            >
              <Archive className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      </div>
    </>
  )

  const className = cn(
    "flex items-start gap-3 rounded-lg border p-4 transition-shadow",
    config.bg,
    config.border,
    !n.read && "ring-1 ring-inset ring-slate-200/80"
  )

  if (n.href && !n.archived) {
    return (
      <Link href={n.href} className={cn(className, "hover:shadow-sm")}>
        {body}
      </Link>
    )
  }

  return <div className={className}>{body}</div>
}

function GroupedBlock({
  severity,
  notifications,
  onAcknowledge,
  onArchive,
}: {
  severity: NotificationSeverity
  notifications: Notification[]
  onAcknowledge: (id: string) => void
  onArchive: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const oldest = notifications.reduce((a, b) =>
    new Date(a.timestamp) < new Date(b.timestamp) ? a : b
  )
  const label =
    severity === "error"
      ? `${notifications.length} errors`
      : `${notifications.length} warnings`

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <span
            className={cn(
              "text-sm font-semibold",
              severity === "error" ? "text-red-700" : "text-amber-700"
            )}
          >
            {label}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            · oldest{" "}
            {formatDistanceToNow(new Date(oldest.timestamp), {
              addSuffix: true,
            })}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>
      {expanded ? (
        <div className="space-y-2 border-t border-slate-100 p-2">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onAcknowledge={onAcknowledge}
              onArchive={onArchive}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function NotificationsFeed() {
  const appMode = useAppMode()
  const access = useOptionalAccess()
  const notifications = useNotificationsStore((s) => s.notifications)
  const acknowledge = useNotificationsStore((s) => s.acknowledge)
  const archive = useNotificationsStore((s) => s.archive)
  const markAllRead = useNotificationsStore((s) => s.markAllRead)

  const [filter, setFilter] = useState<FeedFilter>("all")
  const [includeArchived, setIncludeArchived] = useState(false)

  const counts = useMemo(() => {
    const active = notifications.filter((n) => !n.archived)
    return {
      all: active.length,
      errors: active.filter((n) => n.severity === "error").length,
      warnings: active.filter((n) => n.severity === "warning").length,
      info: active.filter(
        (n) => n.severity === "info" || n.severity === "success"
      ).length,
      archived: notifications.filter((n) => n.archived).length,
    }
  }, [notifications])

  const filtered = useMemo(() => {
    let list = [...notifications].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    if (filter === "archived" || includeArchived) {
      return list.filter((n) => matchesFilter(n, filter))
    }
    return list.filter(
      (n) => !n.archived && matchesFilter(n, filter === "all" ? "all" : filter)
    )
  }, [notifications, filter, includeArchived])

  const feedItems = useMemo(() => buildFeedItems(filtered), [filtered])

  const handleAcknowledge = (id: string) => {
    if (appMode === "demo" || access?.can("settings.view")) acknowledge(id, "access-controlled user")
  }

  const handleArchive = (id: string) => {
    archive(id)
  }

  const chips: { id: FeedFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "errors", label: "Errors", count: counts.errors },
    { id: "warnings", label: "Warnings", count: counts.warnings },
    { id: "info", label: "Info", count: counts.info },
    { id: "archived", label: "Archived", count: counts.archived },
  ]

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Notifications
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-slate-300"
            />
            Include archived
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markAllRead()}
          >
            Mark all read
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === chip.id
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {chip.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                filter === chip.id
                  ? "bg-sky-500 text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {feedItems.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No notifications in this view
        </div>
      ) : (
        <div className="space-y-2">
          {feedItems.map((item) =>
            item.kind === "group" ? (
              <GroupedBlock
                key={`${item.severity}-${item.notifications[0].id}`}
                severity={item.severity}
                notifications={item.notifications}
                onAcknowledge={handleAcknowledge}
                onArchive={handleArchive}
              />
            ) : (
              <NotificationRow
                key={item.notification.id}
                notification={item.notification}
                onAcknowledge={handleAcknowledge}
                onArchive={handleArchive}
              />
            )
          )}
        </div>
      )}
    </section>
  )
}
