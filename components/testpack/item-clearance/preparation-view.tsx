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
  ListChecks,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useTestpackStore, useItemClearanceKPIs, useTeams } from "@/store";
import { type PunchCategory } from "@/lib/testpack-seed";

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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterState {
  categories: PunchCategory[];
  testPack: string;
  system: string;
  areaClass: string;
  originator: string;
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

function CategoryBadge({ category }: { category: PunchCategory }) {
  const cls =
    category === "X"
      ? "bg-red-100 text-red-800 border border-red-300"
      : category === "Y"
        ? "bg-amber-100 text-amber-800 border border-amber-300"
        : "bg-slate-100 text-slate-700 border border-slate-300";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        cls,
      )}
    >
      {category}
    </span>
  );
}

export function PreparationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testpackParam = searchParams.get("testpack") ?? "";

  const punchItems = useTestpackStore((s) => s.punchItems);
  const testPacks = useTestpackStore((s) => s.testPacks);
  const assignItemClearance = useTestpackStore((s) => s.assignItemClearance);
  const kpis = useItemClearanceKPIs();
  const finishingTeams = useTeams("finishing");

  const [filters, setFilters] = useState<FilterState>({
    categories: ["X"],
    testPack: testpackParam || "all",
    system: "all",
    areaClass: "all",
    originator: "all",
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
    "id" | "code" | "isoId" | "testpack" | "originator" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const unassignedItems = useMemo(() => {
    return punchItems.filter((pi) => !pi.clearedAt && !pi.clearanceRequestId);
  }, [punchItems]);

  const filtered = useMemo(() => {
    let rows = unassignedItems.map((pi) => {
      const tp = testPacks.find((t) => t.id === pi.isoId.replace("ISO-", ""));
      // Map isoId to testpack via lookup
      const iso = useTestpackStore
        .getState()
        .isos.find((i) => i.id === pi.isoId);
      const actualTp = testPacks.find((t) => t.id === iso?.testpackId);
      return {
        ...pi,
        testPackName: actualTp?.no ?? "—",
        system: actualTp?.system ?? "",
        areaClass: actualTp?.areaClassification ?? "",
      };
    });

    if (filters.categories.length > 0) {
      rows = rows.filter((r) => filters.categories.includes(r.category));
    }
    if (filters.testPack !== "all") {
      rows = rows.filter((r) => {
        const iso = useTestpackStore
          .getState()
          .isos.find((i) => i.id === r.isoId);
        return iso?.testpackId === filters.testPack;
      });
    }
    if (filters.system !== "all") {
      rows = rows.filter((r) => r.system === filters.system);
    }
    if (filters.areaClass !== "all") {
      rows = rows.filter((r) => r.areaClass === filters.areaClass);
    }
    if (filters.originator !== "all") {
      rows = rows.filter((r) => r.originator === filters.originator);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.isoId.toLowerCase().includes(q),
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
  }, [unassignedItems, testPacks, filters, sortCol, sortDir]);

  const handleSort = (
    col: "id" | "code" | "isoId" | "testpack" | "originator",
  ) => {
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

    const ids = Array.from(selectedIds);
    const { requestId } = assignItemClearance(ids, selectedTeam);

    setIsAssigning(false);
    setSelectedIds(new Set());
    setSelectedTeam("");

    toast.success(
      `Item Clearance Request ${requestId} created · ${ids.length} items assigned to ${selectedTeam}`,
      {
        action: {
          label: "View in Progress",
          onClick: () =>
            router.push(
              `/testpack/pressure-test/item-clearance/progress?request=${requestId}`,
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
  const allAreaClasses = useMemo(
    () => Array.from(new Set(testPacks.map((tp) => tp.areaClassification))),
    [testPacks],
  );
  const allTestPacks = useMemo(
    () => testPacks.filter((tp) => tp.isoIds.length > 0),
    [testPacks],
  );
  const allOriginators = useMemo(() => {
    const set = new Set(unassignedItems.map((pi) => pi.originator));
    return Array.from(set);
  }, [unassignedItems]);

  const toggleCategory = (cat: PunchCategory) => {
    setFilters((f) => {
      const has = f.categories.includes(cat);
      const next = has
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat];
      return { ...f, categories: next };
    });
  };

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
                Item Clearance KPIs
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span className="text-slate-700">
                  <span className="font-semibold text-red-600">
                    {kpis.openX}
                  </span>{" "}
                  Open X
                </span>
                <span className="text-slate-700">
                  <span className="font-semibold text-amber-600">
                    {kpis.openY}
                  </span>{" "}
                  Open Y
                </span>
                <span className="text-slate-700">
                  <span className="font-semibold text-slate-600">
                    {kpis.openZ}
                  </span>{" "}
                  Open Z
                </span>
                <span className="text-slate-700">
                  <span className="font-semibold text-sky-600">
                    {kpis.assignedCount}
                  </span>{" "}
                  Assigned
                </span>
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Category
              </Label>
              <div className="flex flex-col gap-1.5">
                {(["X", "Y", "Z"] as PunchCategory[]).map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.categories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                      className="border-slate-300 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                    />
                    <span className="text-xs text-slate-700">{cat}</span>
                  </label>
                ))}
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
                    className="text-slate-900 focus:bg-slate-100"
                  >
                    All
                  </SelectItem>
                  {allTestPacks.map((tp) => (
                    <SelectItem
                      key={tp.id}
                      value={tp.id}
                      className="text-slate-900 focus:bg-slate-100"
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
                    className="text-slate-900 focus:bg-slate-100"
                  >
                    All
                  </SelectItem>
                  {allSystems.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-slate-900 focus:bg-slate-100"
                    >
                      {s}
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
                    className="text-slate-900 focus:bg-slate-100"
                  >
                    All
                  </SelectItem>
                  {allAreaClasses.map((ac) => (
                    <SelectItem
                      key={ac}
                      value={ac}
                      className="text-slate-900 focus:bg-slate-100"
                    >
                      {ac}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Originator */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Originator
              </Label>
              <Select
                value={filters.originator}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, originator: v }))
                }
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-slate-900 focus:bg-slate-100"
                  >
                    All
                  </SelectItem>
                  {allOriginators.map((o) => (
                    <SelectItem
                      key={o}
                      value={o}
                      className="text-slate-900 focus:bg-slate-100"
                    >
                      {o}
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
              <ListChecks className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Item Clearance Preparation
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 border border-sky-300">
                {filtered.length} unassigned
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
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                placeholder="Search punch items…"
                className="pl-8 h-8 w-56 bg-slate-50 border-slate-300 text-slate-900 text-xs placeholder:text-slate-500 focus-visible:ring-sky-600"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <ListChecks className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">
                  No open punch items in the selected categories — all current
                  punches are assigned or cleared.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-sm min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-3 py-2.5 w-10">
                      <Checkbox
                        checked={
                          filtered.length > 0 &&
                          selectedIds.size === filtered.length
                        }
                        onCheckedChange={toggleAll}
                        className="border-slate-300 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                      />
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors"
                      onClick={() => handleSort("id")}
                    >
                      <span className="inline-flex items-center">
                        Punch ID
                        <SortIcon active={sortCol === "id"} dir={sortDir} />
                      </span>
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors"
                      onClick={() => handleSort("code")}
                    >
                      <span className="inline-flex items-center">
                        Code
                        <SortIcon active={sortCol === "code"} dir={sortDir} />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Description
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Cat
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors"
                      onClick={() => handleSort("isoId")}
                    >
                      <span className="inline-flex items-center">
                        ISO
                        <SortIcon active={sortCol === "isoId"} dir={sortDir} />
                      </span>
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors"
                      onClick={() => handleSort("testpack")}
                    >
                      <span className="inline-flex items-center">
                        Testpack
                        <SortIcon
                          active={sortCol === "testpack"}
                          dir={sortDir}
                        />
                      </span>
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors"
                      onClick={() => handleSort("originator")}
                    >
                      <span className="inline-flex items-center">
                        Originator
                        <SortIcon
                          active={sortCol === "originator"}
                          dir={sortDir}
                        />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const isSelected = selectedIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-b border-slate-200 transition-colors",
                          i % 2 === 0 && "bg-white",
                          i % 2 !== 0 && "bg-slate-50",
                          isSelected && "bg-sky-50 border-sky-200",
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(row.id)}
                            className="border-slate-300 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                          />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-semibold text-sky-600 text-xs font-mono">
                            {row.id}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-700 font-mono">
                            {row.code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-600">
                            {row.description}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <CategoryBadge category={row.category} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-700 font-mono">
                            {row.isoId}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-700 font-mono">
                            {row.testPackName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-600">
                            {row.originator}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-500">
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleDateString(
                                  "en-GB",
                                )
                              : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Floating action bar */}
          {selectedIds.size > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-4 flex-shrink-0">
              <span className="text-sm text-slate-700">
                <span className="font-semibold">{selectedIds.size}</span> punch{" "}
                {selectedIds.size !== 1 ? "items" : "item"} selected
              </span>
              <div className="h-4 w-px bg-slate-300" />
              <span className="text-sm text-slate-600">Assign to:</span>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[180px] h-8 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  {finishingTeams.map((team) => (
                    <SelectItem
                      key={team.code}
                      value={team.code}
                      className="text-slate-900 focus:bg-slate-100"
                    >
                      {team.code} — {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedTeam || isAssigning}
                onClick={handleAssign}
                className="h-8 text-xs gap-1.5"
              >
                {isAssigning ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Generate Item Clearance Request
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
