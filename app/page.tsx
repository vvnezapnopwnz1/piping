"use client";

import Link from "next/link";
import {
  AlertCircle,
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
import { NotificationsFeed } from "@/components/notifications/notifications-feed";
import { useAppMode } from "@/contexts/app-mode-context";
import { useWeldsKPIs } from "@/store/welds-store";
import { useBatchesKPIs, useHydrateBatchesStore } from "@/store/batches-store";

export default function HomePage() {
  const hasHydrated = useHydrateBatchesStore();
  const kpis = useWeldsKPIs();
  const batchKpis = useBatchesKPIs();
  const appMode = useAppMode();

  if (!hasHydrated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* This dashboard still reads the demo stores. In Supabase mode it therefore shows
          invented figures next to real project data — a browser walk on 2026-08-02 found
          it reporting "Welds requiring action 1" and "NDE batches active 4" against a
          project with no spools at all. Rebuilding it on spool_construction_status is
          Track 11; until then, say so rather than let the numbers read as real. */}
      {appMode === "supabase" ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          This dashboard still shows demonstration figures and is not yet connected to
          project data. Use the module screens for real numbers.
        </div>
      ) : null}
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

      <NotificationsFeed />
    </div>
  );
}
