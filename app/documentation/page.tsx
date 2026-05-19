"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Status = "live" | "partial" | "placeholder";

const statusClass: Record<Status, string> = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-amber-200 bg-amber-50 text-amber-800",
  placeholder: "border-slate-200 bg-slate-100 text-slate-600",
};

const heroFlows = [
  {
    title: "Anna's day",
    subtitle: "Track A — testpack release workflow",
    steps: [
      {
        route: "/testpack/explorer",
        action: "open Explorer and inspect a testpack/ISO drill-down",
        expected:
          "live gates show line check, clearance, NDE, flange, testing and reinstatement readiness",
      },
      {
        route: "/testpack/pressure-test/line-check/preparation",
        action: "assign a line-check team",
        expected: "line-check preparation state updates in the testpack store",
      },
      {
        route: "/testpack/pressure-test/line-check/progress",
        action: "record checked items / open punch items",
        expected:
          "progress and outstanding work are reflected back in Explorer gates",
      },
      {
        route: "/testpack/pressure-test/testing-precomm/progress",
        action: "set testing dates and progress",
        expected:
          "testing/pre-commissioning progress advances for the selected pack",
      },
    ],
  },
  {
    title: "WLD-099 rework cascade",
    subtitle: "NDE -> rework",
    steps: [
      {
        route: "/fabrication/weld-progress",
        action: "open weld progress and select WLD-099",
        expected:
          "weld detail panel exposes shop weld data and send-to-NDE context",
      },
      {
        route: "/nde",
        action: "create or open an NDE batch and receive per-weld results",
        expected: "failed welds are marked for rework and batch state persists",
      },
      {
        route: "/fabrication/weld-progress",
        action: "return to WLD-099",
        expected:
          "rework status is visible in the weld workflow instead of being isolated in NDE",
      },
    ],
  },
  {
    title: "Spool fabrication funnel",
    subtitle: "Track G — material check -> weld -> paint -> laydown -> release",
    steps: [
      {
        route: "/fabrication/dashboard",
        action: "open the dashboard funnel",
        expected:
          "spools are grouped across Material Check, Weld Progress, QC Release, Paint and Laydown stages",
      },
      {
        route: "/fabrication/material-check",
        action: "complete material checks and sign off a spool",
        expected:
          "the spool advances toward weld progress with audit trail in local store",
      },
      {
        route: "/fabrication/qc-release",
        action: "release a fabricated spool to paint",
        expected: "the spool moves into Sent to Paint/Paint workflow",
      },
      {
        route: "/fabrication/paint",
        action: "record paint/DFT sign-off",
        expected: "painted spool becomes available for laydown",
      },
      {
        route: "/fabrication/laydown",
        action: "place the spool in yard and release to site",
        expected: "laydown release creates the upstream handoff for erection",
      },
    ],
  },
  {
    title: "Field handoff loop",
    subtitle: "E2/F2 — site welds and NDE source tagging",
    steps: [
      {
        route: "/erection/dashboard",
        action: "open site dashboard",
        expected: "field weld and erected/spooled readiness KPIs are visible",
      },
      {
        route: "/erection/weld-progress",
        action: "send a field weld to NDE from the detail panel",
        expected: "NDE receives a field-sourced batch link",
      },
      {
        route: "/nde",
        action: "open the linked batch",
        expected:
          "shop/field source context is preserved for receiving results",
      },
    ],
  },
];

const modules: Array<{
  module: string;
  page: string;
  status: Status;
  notes: string;
}> = [
  {
    module: "Home",
    page: "/",
    status: "live",
    notes: "dashboard cards use notification, weld and batch Zustand KPIs",
  },
  {
    module: "Admin Module",
    page: "/admin",
    status: "live",
    notes:
      "teams, subcontractors and reference tabs; B2 reference tabs are read-only",
  },
  {
    module: "Spooling Module",
    page: "/spooling",
    status: "partial",
    notes:
      "demo import, validation and revision panels use a store; broader spooling lifecycle is still thin",
  },
  {
    module: "Fabrication / Dashboard",
    page: "/fabrication/dashboard",
    status: "live",
    notes: "Track G funnel is live with persisted stage counts and deep links",
  },
  {
    module: "Fabrication / Material Check",
    page: "/fabrication/material-check",
    status: "live",
    notes: "real local store, checklist/sign-off and audit trail persist",
  },
  {
    module: "Fabrication / QC Release",
    page: "/fabrication/qc-release",
    status: "live",
    notes: "fabricated -> released advancement works through persisted store",
  },
  {
    module: "Fabrication / Paint",
    page: "/fabrication/paint",
    status: "live",
    notes:
      "dispatch, paint sign-off and DFT mock fields work in the Track G store",
  },
  {
    module: "Fabrication / Laydown",
    page: "/fabrication/laydown",
    status: "live",
    notes: "yard placement and release-to-site handoff are persisted",
  },
  {
    module: "Fabrication / Weld Progress",
    page: "/fabrication/weld-progress",
    status: "live",
    notes:
      "filtering, detail panel, spool deep-link and shop send-to-NDE are wired to store data",
  },
  {
    module: "Erection / Dashboard",
    page: "/erection/dashboard",
    status: "partial",
    notes:
      "live field weld/store KPIs; stage workflow is represented mostly as status badges",
  },
  {
    module: "Erection / RFT",
    page: "/erection/rft",
    status: "live",
    notes:
      "auto-derived RFT stage — watcher fires on Supported confirmation; read-only list with filter chips and predecessor audit panel",
  },
  {
    module: "Erection / Field Material Check",
    page: "/erection/material-check",
    status: "live",
    notes:
      "per-spool field joint material check with inline heat-piece editing, sign-off gating, and To Site bridge",
  },
  {
    module: "Erection / Site Weld Progress",
    page: "/erection/weld-progress",
    status: "live",
    notes:
      "filters, detail panel and field send-to-NDE action work with source tagging",
  },
  {
    module: "Tracking",
    page: "/tracking",
    status: "live",
    notes:
      "spool tracking dashboard is live; barcode/PDA/offline sync are out of scope",
  },
  {
    module: "NDE Module",
    page: "/nde",
    status: "live",
    notes:
      "create batch wizard and per-weld receive-results flow persist in Zustand/localStorage",
  },
  {
    module: "Reports",
    page: "/reports",
    status: "partial",
    notes:
      "report catalogue UI plus live counts from stores; report generation/export remains mock-like",
  },
  {
    module: "Testpack / Explorer",
    page: "/testpack/explorer",
    status: "live",
    notes:
      "release gates bridge testpack, weld, NDE, erection and flange stores",
  },
  {
    module: "Testpack / Pressure Test",
    page: "/testpack/pressure-test",
    status: "live",
    notes:
      "homepage links into live preparation/progress screens for Track A stages",
  },
  {
    module: "Flange Management",
    page: "/flange",
    status: "partial",
    notes:
      "browse/filter/update flange joints and reinstatement requests; full flange module is not complete",
  },
  {
    module: "Settings",
    page: "/settings",
    status: "placeholder",
    notes: "static shell only",
  },
  {
    module: "Documentation",
    page: "/documentation",
    status: "live",
    notes: "this devlog page; local checkbox state only",
  },
];

const mergedTracks = [
  ["A1", "Line Check Preparation + Progress"],
  ["A2", "Item Clearance Preparation + Progress"],
  ["A3", "Explorer live gates (Release Tracking)"],
  ["A4", "Blinding Preparation + Progress"],
  ["A5", "Testing & Pre-comm Progress"],
  ["A6", "Reinstatement Preparation + Progress"],
  ["B1", "Admin shell + Teams + Subcontractors + Welder Qualifications"],
  ["B2", "WPS / NDE Matrix / Rework Codes / Joint Categories (read-only)"],
  ["E2.1", "Erection store (persistence)"],
  ["E2.3", "Spool readiness gate (F\u2194E handoff)"],
  ["E2.4", "Send field weld to NDE (source=field)"],
  ["E2.5", "ISO weld rollup + Track A bridge"],
  ["F1", "Live fabrication dashboard KPIs"],
  ["F2", "Send to NDE from weld detail panel"],
  ["F3", "/fabrication landing redirect + sidebar fix"],
  ["G1", "Spool fabrication funnel + 8-stage derivation"],
  ["G1.1", "Funnel navigation cleanup"],
  ["G2", "Material Check screen + persisted spools store"],
  ["G3", "QC Release screen + Fabricated → Released"],
  ["G4", "Paint stages — dispatch, sign-off, DFT"],
  ["G5", "Laydown — yard placement + release to site"],
  ["I1", "Erection lifecycle foundation + live dashboard funnel"],
  ["I2", "To Site screen — laydown receipt confirmation + persisted store"],
  ["I3", "Erected screen — spool placement confirmation + persisted store"],
  ["I4", "Welded/Bolted screen — gating sign-off + rollup + persisted store"],
  [
    "I5",
    "Supported screen — supports tracking + confirmation + persisted store",
  ],
  [
    "I6",
    "RFT auto-derivation — watcher, store, read-only list, funnel cleanup",
  ],
  [
    "I7",
    "Field Material Check — per-joint heat-piece verification, sign-off gating, and erection blocking",
  ],
  ["N1", "Create Batch wizard"],
  ["N2", "Per-weld Receive Results"],
  ["N3", "Source filter (Shop/Field) on NDE batches"],
];

const nextTracks = [
  ["N4", "Enhanced NDE notifications"],
  ["B3", "Systems/Subsystems + Material Class admin tabs"],
  ["Track H", "Testpack Builder (§15) — assemble ISOs into test packs"],
  ["§19.2", "Flange torquing progress — assign jointer + record torque pass"],
  ["Track D", "Spooling depth — ident code lookup + bolting report import"],
];

function ChecklistRow({
  id,
  route,
  action,
  expected,
  checked,
  onCheckedChange,
}: {
  id: string;
  route: string;
  action: string;
  expected: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[auto_10rem_1fr]">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-1"
      />
      <Link
        href={route}
        className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
      >
        {route}
      </Link>
      <label htmlFor={id} className="text-sm leading-6 text-slate-700">
        <span className="font-medium text-slate-950">click/check:</span>{" "}
        {action} <span className="text-slate-400">{"->"}</span>{" "}
        <span className="font-medium text-slate-950">expected:</span> {expected}
      </label>
    </div>
  );
}

export default function DocumentationPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-sm">
        <Badge className="mb-3 border-orange-300 bg-orange-200 text-orange-950">
          alpha demo devlog
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          PipeQC Development Log
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-200">
          This is a development-process devlog, not user documentation. Many
          screens are placeholders. Data is mock data, with persistence only in
          Zustand store / localStorage.
        </p>
      </div>

      <Tabs defaultValue="overview" className="gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="works">What works</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="tracks">Tracks & Stories</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>What this page is</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6 text-slate-700">
                <p>
                  PipeQC is an alpha demo of a piping QC workflow for oil & gas
                  / EPC discovery sessions. It exists to inspect assumptions,
                  navigate workflows, and talk through product scope.
                </p>
                <p>
                  Audience: PMs, designers and engineers. It is not written for
                  end-user inspectors, and it intentionally calls out fake or
                  partial areas instead of hiding them.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stack</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {[
                  "Next.js App Router",
                  "React",
                  "TypeScript",
                  "Tailwind",
                  "shadcn/ui",
                  "Zustand",
                ].map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="works">
          <div className="space-y-5">
            {heroFlows.map((flow, flowIndex) => (
              <Card key={flow.title}>
                <CardHeader>
                  <CardTitle>{flow.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {flow.subtitle}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {flow.steps.map((step, stepIndex) => {
                    const id = `flow-${flowIndex}-${stepIndex}`;
                    return (
                      <ChecklistRow
                        key={id}
                        id={id}
                        checked={!!checked[id]}
                        onCheckedChange={(value) =>
                          setChecked((state) => ({ ...state, [id]: value }))
                        }
                        {...step}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Sidebar modules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Canonical route list comes from the application sidebar
                configuration.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="border-b text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4 font-medium">Module</th>
                      <th className="py-3 pr-4 font-medium">Page</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 font-medium">
                        What is fake / what works
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((item) => (
                      <tr
                        key={item.page}
                        className="border-b align-top last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">{item.module}</td>
                        <td className="py-3 pr-4">
                          <Link
                            href={item.page}
                            className="text-sky-700 underline-offset-4 hover:underline"
                          >
                            {item.page}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={statusClass[item.status]}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-700">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracks">
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Merged tracks</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Closed list mirrors docs/tracks/track_list.md.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {mergedTracks.map(([phase, description], index) => {
                  const id = `track-${phase}`;
                  return (
                    <div key={phase} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{phase}</Badge>
                        <span className="font-medium">{description}</span>
                      </div>
                      <div className="mt-3 flex gap-3 text-sm text-slate-700">
                        <Checkbox
                          id={id}
                          checked={!!checked[id]}
                          onCheckedChange={(value) =>
                            setChecked((state) => ({
                              ...state,
                              [id]: value === true,
                            }))
                          }
                        />
                        <label htmlFor={id}>
                          As a workflow reviewer, I want to verify{" "}
                          {description.toLowerCase()} by opening the related
                          route, changing one visible state where available, and
                          confirming the next gate/KPI reflects it.
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Self-check #{index + 1}: navigate {"->"} interact {"->"}{" "}
                        verify reflected state.
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Next / Backlog</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Priority order from track_list.md; marked not implemented
                  here.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextTracks.map(([phase, description]) => (
                  <div
                    key={phase}
                    className="flex items-start gap-3 rounded-lg border bg-slate-50 p-3 text-sm"
                  >
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-white text-slate-600"
                    >
                      {phase}
                    </Badge>
                    <div>
                      <p className="font-medium">{description}</p>
                      <p className="text-muted-foreground">not implemented</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
