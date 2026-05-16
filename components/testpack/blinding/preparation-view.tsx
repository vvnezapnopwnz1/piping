"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ClipboardCheck,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useTestpackStore, useBlindingKPIs, BLINDING_TEAMS } from "@/store";
import { SEED_ISO_SPOOLS } from "@/lib/testpack-seed";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterState {
  testPack: string;
  system: string;
  location: string;
  areaClass: string;
  search: string;
}

function SortIcon({
  active,
  dir,
}: {
  active: boolean;
  dir: "asc" | "desc" | null;
}) {
  if (!active)
    return <ChevronsUpDown className="w-3 h-3 text-slate-400 ml-1" />;
  if (dir === "asc") return <ChevronUp className="w-3 h-3 text-sky-600 ml-1" />;
  return <ChevronDown className="w-3 h-3 text-sky-600 ml-1" />;
}

export function PreparationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testpackParam = searchParams.get("testpack") ?? "";

  const testPacks = useTestpackStore((s) => s.testPacks);
  const assignBlinding = useTestpackStore((s) => s.assignBlinding);
  const kpis = useBlindingKPIs();

  const [filters, setFilters] = useState<FilterState>({
    testPack: testpackParam || "all",
    system: "all",
    location: "all",
    areaClass: "all",
    search: "",
  });

  useEffect(() => {
    if (testpackParam) {
      setFilters((f) => ({ ...f, testPack: testpackParam }));
    }
  }, [testpackParam]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [sortCol, setSortCol] = useState<
    "no" | "system" | "subsystem" | "location" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const eligibleTestPacks = useMemo(() => {
    return testPacks.filter((tp) => tp.blindingStatus === "Eligible");
  }, [testPacks]);

  const filtered = useMemo(() => {
    let rows = eligibleTestPacks.map((tp) => {
      const isoCount = tp.isoIds.length;
      const spoolCount = tp.isoIds.reduce((sum, isoId) => {
        const s = SEED_ISO_SPOOLS.find((x) => x.isoId === isoId);
        return sum + (s?.spoolIds.length ?? 0);
      }, 0);
      return {
        ...tp,
        isoCount,
        weldCount: spoolCount * 2,
      };
    });

    if (filters.testPack !== "all") {
      rows = rows.filter((r) => r.id === filters.testPack);
    }
    if (filters.system !== "all") {
      rows = rows.filter((r) => r.system === filters.system);
    }
    if (filters.location !== "all") {
      rows = rows.filter((r) => r.location === filters.location);
    }
    if (filters.areaClass !== "all") {
      rows = rows.filter((r) => r.areaClassification === filters.areaClass);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.no.toLowerCase().includes(q) ||
          r.system.toLowerCase().includes(q) ||
          r.subsystem.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q),
      );
    }

    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const av = String(a[sortCol as keyof typeof a] ?? "");
        const bv = String(b[sortCol as keyof typeof b] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return rows;
  }, [eligibleTestPacks, filters, sortCol, sortDir]);

  const handleSort = (col: "no" | "system" | "subsystem" | "location") => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortCol(null);
        setSortDir(null);
      }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleAssign = async () => {
    if (!selectedTeam || selectedIds.size === 0) return;
    setIsAssigning(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

    const testpackIds = Array.from(selectedIds);
    const { requestId } = assignBlinding(testpackIds, selectedTeam);

    setIsAssigning(false);
    setSelectedIds(new Set());
    setSelectedTeam("");

    toast.success(
      `Blinding Request ${requestId} created \u00b7 ${testpackIds.length} testpack${testpackIds.length !== 1 ? "s" : ""} assigned to ${selectedTeam}`,
      {
        action: {
          label: "View in Progress",
          onClick: () =>
            router.push(
              `/testpack/pressure-test/blinding/progress?request=${requestId}`,
            ),
        },
        duration: 5000,
      },
    );
  };

  const allSystems = useMemo(
    () => Array.from(new Set(testPacks.map((tp) => tp.system))),
    [testPacks],
  );
  const allLocations = useMemo(
    () => Array.from(new Set(testPacks.map((tp) => tp.location))),
    [testPacks],
  );
  const allTestPacks = useMemo(
    () => testPacks.filter((tp) => tp.isoIds.length > 0),
    [testPacks],
  );
  const allAreaClasses = useMemo(
    () => Array.from(new Set(testPacks.map((tp) => tp.areaClassification))),
    [testPacks],
  );

  return (
    <>
      <Link
        href="/testpack/pressure-test"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600 mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Pressure Test
      </Link>
      <div className="flex h-full gap-4 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[240px] flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex flex-col h-full overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-semibold text-slate-900 tracking-wide uppercase">
                Filters
              </span>
            </div>
          </div>

          <div className="flex-1 px-3 py-5 flex flex-col gap-5">
            {/* KPI strip */}
            <div className="px-2 py-2 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Blinding KPIs
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span className="text-slate-700">
                  <span className="font-semibold text-sky-600">
                    {kpis.eligibleCount}
                  </span>{" "}
                  Eligible
                </span>
                <span className="text-slate-700">
                  <span className="font-semibold text-amber-600">
                    {kpis.assignedCount}
                  </span>{" "}
                  Assigned
                </span>
                <span className="text-slate-700">
                  <span className="font-semibold text-emerald-600">
                    {kpis.doneCount}
                  </span>{" "}
                  Done
                </span>
              </div>
            </div>

            {/* Test Pack */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Test Pack
              </Label>
              <Select
                value={filters.testPack}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, testPack: v }))
                }
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-sm text-slate-700 focus:bg-slate-100"
                  >
                    All
                  </SelectItem>
                  {allTestPacks.map((tp) => (
                    <SelectItem
                      key={tp.id}
                      value={tp.id}
                      className="text-sm text-slate-700 focus:bg-slate-100"
                    >
                      {tp.no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                System
              </Label>
              <Select
                value={filters.system}
                onValueChange={(v) => setFilters((f) => ({ ...f, system: v }))}
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-sm text-slate-700 focus:bg-slate-100"
                  >
                    All
                  </SelectItem>
                  {allSystems.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-sm text-slate-700 focus:bg-slate-100"
                    >
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Location
              </Label>
              <Select
                value={filters.location}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, location: v }))
                }
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-sm text-slate-700 focus:bg-slate-100"
                  >
                    All
                  </SelectItem>
                  {allLocations.map((loc) => (
                    <SelectItem
                      key={loc}
                      value={loc}
                      className="text-sm text-slate-700 focus:bg-slate-100"
                    >
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area Classification */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Area Classification
              </Label>
              <Select
                value={filters.areaClass}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, areaClass: v }))
                }
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-sm text-slate-700 focus:bg-slate-100"
                  >
                    All
                  </SelectItem>
                  {allAreaClasses.map((ac) => (
                    <SelectItem
                      key={ac}
                      value={ac}
                      className="text-sm text-slate-700 focus:bg-slate-100"
                    >
                      {ac}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col h-full overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-violet-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Blinding Preparation
              </h2>
              <span className="text-xs text-slate-500">
                {filtered.length} testpack{filtered.length !== 1 ? "s" : ""}{" "}
                eligible
              </span>
              {filters.testPack !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-700 border-sky-200 gap-1 cursor-pointer hover:bg-sky-100"
                  onClick={() => setFilters((f) => ({ ...f, testPack: "all" }))}
                >
                  testpack:{" "}
                  {testPacks.find((t) => t.id === filters.testPack)?.no ??
                    filters.testPack}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400 absolute ml-2.5 pointer-events-none" />
              <Input
                placeholder="Search testpacks..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                className="pl-8 h-8 w-56 text-sm bg-white border-slate-300"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 w-10">
                    <Checkbox
                      checked={
                        filtered.length > 0 &&
                        selectedIds.size === filtered.length
                      }
                      onCheckedChange={toggleAll}
                      className="border-slate-400"
                    />
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer select-none"
                    onClick={() => handleSort("no")}
                  >
                    <span className="flex items-center">
                      Testpack No
                      <SortIcon active={sortCol === "no"} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer select-none"
                    onClick={() => handleSort("system")}
                  >
                    <span className="flex items-center">
                      System
                      <SortIcon active={sortCol === "system"} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer select-none"
                    onClick={() => handleSort("subsystem")}
                  >
                    <span className="flex items-center">
                      Subsystem
                      <SortIcon
                        active={sortCol === "subsystem"}
                        dir={sortDir}
                      />
                    </span>
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer select-none"
                    onClick={() => handleSort("location")}
                  >
                    <span className="flex items-center">
                      Location
                      <SortIcon active={sortCol === "location"} dir={sortDir} />
                    </span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Priority
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    # ISOs
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    # Welds
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      No testpacks eligible for blinding.
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                      selectedIds.has(row.id) && "bg-sky-50",
                    )}
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                        className="border-slate-400"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {row.no}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.system}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.subsystem}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.location}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          row.priority === "High"
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : row.priority === "Medium"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-slate-100 text-slate-700 border border-slate-300",
                        )}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.isoCount}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.weldCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action bar */}
          {selectedIds.size > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0 flex items-center justify-between">
              <span className="text-sm text-slate-700">
                <span className="font-semibold">{selectedIds.size}</span>{" "}
                testpack{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-600 whitespace-nowrap">
                    Assign to:
                  </Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="h-8 text-sm bg-white border-slate-300 w-[180px]">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {BLINDING_TEAMS.map((t) => (
                        <SelectItem
                          key={t.code}
                          value={t.code}
                          className="text-sm"
                        >
                          {t.code} — {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={handleAssign}
                  disabled={!selectedTeam || isAssigning}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isAssigning ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Generate Blinding Request
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
