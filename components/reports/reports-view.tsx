"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  REPORTS_SEED,
  type ReportDef,
  type ReportCategory,
  formatBytes,
  formatRelativeDate,
} from "@/lib/reports-data";
import { useReportsLiveCounts } from "./use-reports-live-counts";

const CATEGORIES: ReportCategory[] = [
  "Fabrication",
  "Erection",
  "Testpack",
  "NDE",
];

const ALL_CATEGORIES = ["All", ...CATEGORIES] as const;

type FilterCategory = (typeof ALL_CATEGORIES)[number];

function isValidCategory(value: string): value is FilterCategory {
  return ALL_CATEGORIES.includes(value as FilterCategory);
}

function buildFilename(r: ReportDef): string {
  const slug = r.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const today = new Date().toISOString().slice(0, 10);
  return `${slug}-${today}.${r.format}`;
}

function categoryPillClass(category: ReportCategory) {
  switch (category) {
    case "Fabrication":
      return "bg-sky-100 text-sky-800 border-sky-300";
    case "Erection":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "Testpack":
      return "bg-violet-100 text-violet-800 border-violet-300";
    case "NDE":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
  }
}

function formatPillClass(format: ReportDef["format"]) {
  switch (format) {
    case "xlsx":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "pdf":
      return "bg-red-100 text-red-800 border-red-300";
    case "csv":
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

export function ReportsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const liveCounts = useReportsLiveCounts();
  const [search, setSearch] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const categoryParam = searchParams.get("category") ?? "";
  const activeCategory: FilterCategory = isValidCategory(categoryParam)
    ? categoryParam
    : "All";

  const handleCategoryChange = (cat: FilterCategory) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "All") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    router.replace(`/reports?${params.toString()}`, { scroll: false });
  };

  const filteredReports = useMemo(() => {
    let rows = [...REPORTS_SEED];
    if (activeCategory !== "All") {
      rows = rows.filter((r) => r.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [activeCategory, search]);

  const kpiCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      All: filteredReports.length,
      Fabrication: filteredReports.filter((r) => r.category === "Fabrication")
        .length,
      Erection: filteredReports.filter((r) => r.category === "Erection").length,
      Testpack: filteredReports.filter((r) => r.category === "Testpack").length,
      NDE: filteredReports.filter((r) => r.category === "NDE").length,
    };
    return counts;
  }, [filteredReports]);

  const handleDownload = async (report: ReportDef) => {
    const filename = buildFilename(report);
    const duration = 900 + Math.random() * 200;
    const t = toast.loading(`Generating ${filename}…`, { duration: Infinity });
    await new Promise((r) => setTimeout(r, duration));
    toast.success(`Downloaded ${filename}`, {
      id: t,
      description: `${report.format.toUpperCase()} · ${formatBytes(
        report.sizeBytes,
      )}`,
      duration: 4000,
      action: {
        label: "View again",
        onClick: () => {
          toast.success(`Downloaded ${filename}`, {
            description: `${report.format.toUpperCase()} · ${formatBytes(
              report.sizeBytes,
            )}`,
            duration: 4000,
          });
        },
      },
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">
          Generate and export project reports, analytics, and documentation.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-3">
        {ALL_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={cn(
                "flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors",
                isActive
                  ? "bg-sky-50 border-sky-300"
                  : "bg-white border-slate-200 hover:bg-slate-50",
              )}
            >
              <span
                className={cn(
                  "text-lg font-bold",
                  isActive ? "text-sky-700" : "text-slate-900",
                )}
              >
                {kpiCounts[cat]}
              </span>
              <span className="text-xs text-slate-500">
                {cat === "All" ? "reports total" : cat}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter strip */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {ALL_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                  isActive
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports…"
            className="pl-8 h-8 w-72 bg-slate-50 border-slate-300 text-slate-900 text-xs placeholder:text-slate-500 focus-visible:ring-sky-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full border-collapse text-sm min-w-[720px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Title
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Category
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Format
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Size
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Last generated
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-sm text-slate-500"
                >
                  No reports match your filters. Clear filters or try a
                  different search.
                </td>
              </tr>
            )}
            {filteredReports.map((report, i) => {
              const absDate = report.lastGeneratedISO.slice(0, 10);
              const lastGenerated = now
                ? formatRelativeDate(report.lastGeneratedISO, now)
                : absDate;

              const liveCount = report.liveCountKey
                ? liveCounts[report.liveCountKey]
                : null;

              return (
                <tr
                  key={report.id}
                  className={cn(
                    "border-b border-slate-200 transition-colors hover:bg-slate-50",
                    i % 2 !== 0 && "bg-slate-50/50",
                  )}
                >
                  {/* Title */}
                  <td className="px-3 py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-start">
                          <span className="font-semibold text-slate-900 text-xs">
                            {report.title}
                          </span>
                          <span className="text-[11px] text-slate-500 leading-tight">
                            {report.description}
                            {liveCount !== null && (
                              <span className="text-sky-600 font-medium ml-1">
                                — {liveCount}{" "}
                                {report.liveCountKey?.startsWith("welds")
                                  ? "welds tracked"
                                  : report.liveCountKey?.startsWith("batches")
                                    ? "batches"
                                    : report.liveCountKey?.startsWith(
                                          "testpack",
                                        )
                                      ? "testpacks"
                                      : report.liveCountKey === "erection.rft"
                                        ? "RFT"
                                        : "field welds"}
                              </span>
                            )}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {report.manualSection ?? report.title}
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                        categoryPillClass(report.category),
                      )}
                    >
                      {report.category}
                    </span>
                  </td>

                  {/* Format */}
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                        formatPillClass(report.format),
                      )}
                    >
                      {report.format.toUpperCase()}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="px-3 py-2 text-xs text-slate-600 font-mono">
                    {formatBytes(report.sizeBytes)}
                  </td>

                  {/* Last generated */}
                  <td className="px-3 py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-slate-600 cursor-help underline decoration-slate-300 underline-offset-2">
                          {lastGenerated}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {report.lastGeneratedISO}
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* Owner */}
                  <td className="px-3 py-2 text-xs text-slate-600 font-mono">
                    {report.owner}
                  </td>

                  {/* Action */}
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 gap-1"
                      onClick={() => handleDownload(report)}
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
