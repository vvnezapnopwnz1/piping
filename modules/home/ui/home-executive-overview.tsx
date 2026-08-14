"use client";

import Link from "next/link";
import { ArrowRight, Factory, ShieldCheck, TowerControl } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptionalAccess } from "@/modules/access/ui/access-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { ExecutiveOverview } from "../domain/executive-overview";
import {
  loadHomeErectionSummary,
  loadHomeFabricationSummary,
  loadHomeNdeSummary,
} from "../infrastructure/supabase-home-overview-repository";

interface ModuleLink {
  href: string;
  title: string;
  description: string;
  note?: string;
}

const MODULES: readonly ModuleLink[] = [
  {
    href: "/admin",
    title: "Administration",
    description:
      "Project definition, referentials, access rights, imports and progress weights.",
  },
  {
    href: "/spooling/browse",
    title: "Spooling",
    description:
      "SpoolGen import, engineering definitions and revision history.",
    note: "ISO workflow and transmittals outstanding",
  },
  {
    href: "/fabrication/dashboard",
    title: "Fabrication",
    description:
      "Material traceability, shop weld progress, PWHT, painting, laydown and QC release.",
  },
  {
    href: "/nde",
    title: "NDE",
    description:
      "Batches, results, repair and tracer cascade, penalty escalation.",
  },
  {
    href: "/erection/dashboard",
    title: "Erection",
    description:
      "To site, erected, field welds, field material, supports, and derived Ready For Test.",
  },
  {
    href: "/tracking",
    title: "Spool Tracking",
    description: "Movement history, current location and transit alerts.",
  },
  {
    href: "/flange",
    title: "Flange Management",
    description: "Flange joints, bolt-up progress and torque records.",
  },
  {
    href: "/testpack",
    title: "Test Packs",
    description:
      "Test pack assembly, readiness and the pressure-test workflow.",
  },
  {
    href: "/reports",
    title: "Reports & Forms",
    description: "Generated reports and forms from durable records.",
  },
];

type SummaryState<T> =
  | { kind: "loading"; projectId: string | null }
  | { kind: "ready"; projectId: string; data: T }
  | { kind: "unavailable"; projectId: string | null };

const unavailable = <T,>(projectId: string | null): SummaryState<T> => ({
  kind: "unavailable",
  projectId,
});

const visibleState = <T,>(
  state: SummaryState<T>,
  projectId: string | undefined,
  canView: boolean,
): SummaryState<T> => {
  if (!projectId || !canView) return unavailable(projectId ?? null);
  return state.projectId === projectId ? state : { kind: "loading", projectId };
};

function ExecutiveMetricCard({
  title,
  description,
  href,
  state,
  totalLabel,
  completedLabel,
  getMetrics,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  state: SummaryState<
    | ExecutiveOverview["fabrication"]
    | ExecutiveOverview["nde"]
    | ExecutiveOverview["erection"]
  >;
  totalLabel: string;
  completedLabel: string;
  getMetrics: (
    data:
      | ExecutiveOverview["fabrication"]
      | ExecutiveOverview["nde"]
      | ExecutiveOverview["erection"],
  ) => { total: number; completed: number; percent: number };
  icon: React.ReactNode;
}) {
  const isUnavailable = state.kind === "unavailable";
  const metrics = state.kind === "ready" ? getMetrics(state.data) : null;

  return (
    <Card
      className={`gap-3 py-4 ${isUnavailable ? "border-dashed" : "bg-card"}`}
    >
      <CardHeader className="gap-1 px-4 pb-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="bg-primary/10 text-primary rounded-md p-1.5">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4">
        {state.kind === "loading" ? <Skeleton className="h-14 w-full" /> : null}
        {isUnavailable ? (
          <p className="text-muted-foreground text-sm">
            Summary is not available with the current project access.
          </p>
        ) : null}
        {metrics ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                {metrics.completed}
              </p>
              <p className="text-muted-foreground text-xs">{completedLabel}</p>
            </div>
            <p className="text-muted-foreground text-right text-sm">
              <span className="font-medium text-foreground">
                {metrics.total}
              </span>
              <br />
              {totalLabel}
            </p>
          </div>
        ) : null}
        <Link
          href={href}
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          Open dashboard <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function HomeExecutiveOverview() {
  const access = useOptionalAccess();
  const projectId = access?.access.projectId;
  const canFabrication = access?.can("fabrication.view") ?? false;
  const canNde = access?.can("nde.view") ?? false;
  const canErection = access?.can("erection.view") ?? false;
  const [fabrication, setFabrication] = useState<
    SummaryState<ExecutiveOverview["fabrication"]>
  >({ kind: "loading", projectId: null });
  const [nde, setNde] = useState<SummaryState<ExecutiveOverview["nde"]>>({
    kind: "loading",
    projectId: null,
  });
  const [erection, setErection] = useState<
    SummaryState<ExecutiveOverview["erection"]>
  >({ kind: "loading", projectId: null });

  useEffect(() => {
    if (!projectId || !canFabrication) return;
    let cancelled = false;
    void loadHomeFabricationSummary(getSupabaseBrowserClient(), projectId)
      .then((data) => {
        if (!cancelled) setFabrication({ kind: "ready", projectId, data });
      })
      .catch(() => {
        if (!cancelled) setFabrication(unavailable(projectId));
      });
    return () => {
      cancelled = true;
    };
  }, [canFabrication, projectId]);

  useEffect(() => {
    if (!projectId || !canNde) return;
    let cancelled = false;
    void loadHomeNdeSummary(getSupabaseBrowserClient(), projectId)
      .then((data) => {
        if (!cancelled) setNde({ kind: "ready", projectId, data });
      })
      .catch(() => {
        if (!cancelled) setNde(unavailable(projectId));
      });
    return () => {
      cancelled = true;
    };
  }, [canNde, projectId]);

  useEffect(() => {
    if (!projectId || !canErection) return;
    let cancelled = false;
    void loadHomeErectionSummary(getSupabaseBrowserClient(), projectId)
      .then((data) => {
        if (!cancelled) setErection({ kind: "ready", projectId, data });
      })
      .catch(() => {
        if (!cancelled) setErection(unavailable(projectId));
      });
    return () => {
      cancelled = true;
    };
  }, [canErection, projectId]);

  const fabricationCardState = visibleState(
    fabrication,
    projectId,
    canFabrication,
  );
  const ndeCardState = visibleState(nde, projectId, canNde);
  const erectionCardState = visibleState(erection, projectId, canErection);

  const attention = useMemo(
    () =>
      [
        ndeCardState.kind === "ready" && ndeCardState.data.issued
          ? {
              href: "/nde/dashboard",
              count: ndeCardState.data.issued,
              label: "NDE obligations issued to inspector",
            }
          : null,
        erectionCardState.kind === "ready" && erectionCardState.data.remaining
          ? {
              href: "/erection/dashboard",
              count: erectionCardState.data.remaining,
              label: "Accepted spools not Ready for Test",
            }
          : null,
      ].filter(
        (item): item is { href: string; count: number; label: string } =>
          item !== null,
      ),
    [ndeCardState, erectionCardState],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        {/* <Badge variant="secondary">Live project control</Badge> */}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          PipeQC control room
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
          A clear view of the current project from fabrication through quality
          and field readiness. Open any module to inspect the underlying,
          durable records.
        </p>
      </section>

      {!projectId ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-medium">
              Select a project to see its live control overview.
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Module navigation remains available below.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section
            aria-label="Project delivery summary"
            className="grid gap-4 lg:grid-cols-3"
          >
            <ExecutiveMetricCard
              title="Fabrication"
              description="Accepted spools progressing through shop completion."
              href="/fabrication/dashboard"
              state={fabricationCardState}
              totalLabel="accepted spools"
              completedLabel="at Laydown"
              icon={<Factory className="size-5" />}
              getMetrics={(data) => {
                const summary = data as ExecutiveOverview["fabrication"];
                return {
                  total: summary.total,
                  completed: summary.completed,
                  percent: summary.percentComplete,
                };
              }}
            />
            <ExecutiveMetricCard
              title="NDE"
              description="Visible inspection workflow and recorded results."
              href="/nde/dashboard"
              state={ndeCardState}
              totalLabel="NDE obligations"
              completedLabel="inspected"
              icon={<ShieldCheck className="size-5" />}
              getMetrics={(data) => {
                const summary = data as ExecutiveOverview["nde"];
                return {
                  total: summary.total,
                  completed: summary.inspected,
                  percent: summary.percentInspected,
                };
              }}
            />
            <ExecutiveMetricCard
              title="Erection"
              description="Field progress derived from accepted spools."
              href="/erection/dashboard"
              state={erectionCardState}
              totalLabel="accepted spools"
              completedLabel="Ready for Test"
              icon={<TowerControl className="size-5" />}
              getMetrics={(data) => {
                const summary = data as ExecutiveOverview["erection"];
                return {
                  total: summary.total,
                  completed: summary.readyForTest,
                  percent: summary.percentReadyForTest,
                };
              }}
            />
          </section>

        </>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Explore the platform
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Every module reads its operational data from the database and
            retains the detailed audit trail.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <Link key={module.href} href={module.href} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <Badge>live</Badge>
                  </div>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                {module.note ? (
                  <CardContent>
                    <p className="text-muted-foreground text-xs">
                      {module.note}
                    </p>
                  </CardContent>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {projectId ? (
        <section aria-label="Open items">
          <Card>
            <CardHeader>
              <CardDescription>
                Open items in the visible project scope.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attention.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {attention.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-2xl font-semibold">{item.count}</p>
                        <p className="text-muted-foreground text-sm">
                          {item.label}
                        </p>
                      </div>
                      <ArrowRight className="text-muted-foreground size-5 group-hover:text-foreground" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No issued NDE work or outstanding Ready for Test spools in
                  the visible scope.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
