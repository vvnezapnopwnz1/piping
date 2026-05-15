"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  Scan,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUnreadNotifications } from "@/store/notifications-store";
import { useWeldsKPIs } from "@/store/welds-store";
import { useBatchesKPIs, useHydrateBatchesStore } from "@/store/batches-store";

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
} as const;

export default function HomePage() {
  const hasHydrated = useHydrateBatchesStore();
  const kpis = useWeldsKPIs();
  const batchKpis = useBatchesKPIs();
  const notifications = useUnreadNotifications();

  if (!hasHydrated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Good morning, QC Engineer</h1>
        <p className="text-sm text-muted-foreground">
          Qatar LNG Train 7 · Thursday, 14 May 2026
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/fabrication/weld-progress" className="group">
          <Card className="h-auto p-4 transition-shadow hover:shadow-md">
            <CardHeader className="gap-1 pb-2">
              <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                <Wrench className="h-3.5 w-3.5" />
                Welds requiring action
              </CardDescription>
              <CardTitle className="text-[30px] font-semibold tracking-tight">
                {kpis.rework + kpis.rejected}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Rework + Rejected</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/nde" className="group">
          <Card className="h-auto p-4 transition-shadow hover:shadow-md">
            <CardHeader className="gap-1 pb-2">
              <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                <Scan className="h-3.5 w-3.5" />
                NDE batches active
              </CardDescription>
              <CardTitle className="text-[30px] font-semibold tracking-tight">
                {batchKpis.active}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {batchKpis.awaitingResults} awaiting results
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/nde" className="group">
          <Card
            className={`h-auto p-4 transition-shadow hover:shadow-md ${
              batchKpis.overdue > 0 ? "border-l-4 border-l-red-500" : ""
            }`}
          >
            <CardHeader className="gap-1 pb-2">
              <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Overdue NDE batches
              </CardDescription>
              <CardTitle
                className={`text-[30px] font-semibold tracking-tight ${
                  batchKpis.overdue > 0 ? "text-red-600" : ""
                }`}
              >
                {batchKpis.overdue}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Results &gt; 5 days late
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Notifications
        </h2>

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            All caught up — no unread notifications
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const config = severityConfig[n.severity];
              const Icon = config.icon;
              return (
                <Link
                  key={n.id}
                  href={n.href ?? "#"}
                  className={`flex items-start gap-3 rounded-lg border p-4 transition-shadow hover:shadow-sm ${config.bg} ${config.border}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.actorLabel ? (
                      <Badge variant="outline" className="text-xs">
                        {n.actorLabel}
                      </Badge>
                    ) : null}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
