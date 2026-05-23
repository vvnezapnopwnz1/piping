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
import { useWeldsKPIs } from "@/store/welds-store";
import { useBatchesKPIs, useHydrateBatchesStore } from "@/store/batches-store";

export default function HomePage() {
  const hasHydrated = useHydrateBatchesStore();
  const kpis = useWeldsKPIs();
  const batchKpis = useBatchesKPIs();

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

      <NotificationsFeed />
    </div>
  );
}
