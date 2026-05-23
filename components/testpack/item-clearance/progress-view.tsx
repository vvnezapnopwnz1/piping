"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ClipboardList,
  ListChecks,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  useTestpackStore,
  useNotificationsStore,
  useItemClearanceKPIs,
  useTeams,
} from "@/store";
import { type PunchCategory } from "@/lib/testpack-seed";

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
import {
  TestpackWorkflowGuards,
  useTestpackWorkflowLocks,
} from "@/components/testpack/testpack-workflow-guards";

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

export function ProgressView() {
  const { pmLocked } = useTestpackWorkflowLocks();
  const searchParams = useSearchParams();
  const requestFilter = searchParams.get("request") ?? "";
  const teamFilter = searchParams.get("team") ?? "";
  const testpackParam = searchParams.get("testpack") ?? "";

  const punchItems = useTestpackStore((s) => s.punchItems);
  const testPacks = useTestpackStore((s) => s.testPacks);
  const clearanceRequests = useTestpackStore((s) => s.clearanceRequests);
  const isos = useTestpackStore((s) => s.isos);
  const markPunchItemsCleared = useTestpackStore(
    (s) => s.markPunchItemsCleared,
  );
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const kpis = useItemClearanceKPIs();
  const finishingTeams = useTeams("finishing");

  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>(teamFilter || "all");
  const [selectedRequest, setSelectedRequest] = useState<string>(
    requestFilter || "all",
  );
  const [selectedTestPack, setSelectedTestPack] = useState<string>(
    testpackParam || "all",
  );
  const [isClearing, setIsClearing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [sortCol, setSortCol] = useState<
    "id" | "code" | "isoId" | "testpack" | "assignedTo" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Assigned-but-not-cleared items
  const activeItems = useMemo(() => {
    return punchItems.filter((pi) => !pi.clearedAt && pi.clearanceRequestId);
  }, [punchItems]);

  const filtered = useMemo(() => {
    let rows = activeItems.map((pi) => {
      const iso = isos.find((i) => i.id === pi.isoId);
      const tp = testPacks.find((t) => t.id === iso?.testpackId);
      const req = clearanceRequests.find((r) => r.id === pi.clearanceRequestId);
      const teamName =
        finishingTeams.find((t) => t.code === req?.assignedTo)?.name ??
        req?.assignedTo ??
        "";
      return {
        ...pi,
        testPackName: tp?.no ?? "—",
        testpackId: iso?.testpackId ?? "",
        system: tp?.system ?? "",
        assignedTo: req?.assignedTo ?? "",
        assignedOn: req?.createdAt ?? "",
        assignedToLabel: teamName,
      };
    });

    if (selectedRequest && selectedRequest !== "all") {
      rows = rows.filter((r) => r.clearanceRequestId === selectedRequest);
    }
    if (selectedTeam && selectedTeam !== "all") {
      rows = rows.filter((r) => r.assignedTo === selectedTeam);
    }
    if (selectedTestPack && selectedTestPack !== "all") {
      rows = rows.filter((r) => r.testpackId === selectedTestPack);
    }
    if (search) {
      const q = search.toLowerCase();
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
  }, [
    activeItems,
    isos,
    testPacks,
    clearanceRequests,
    selectedRequest,
    selectedTeam,
    selectedTestPack,
    search,
    sortCol,
    sortDir,
  ]);

  const handleSort = (
    col: "id" | "code" | "isoId" | "testpack" | "assignedTo",
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

  const recentlyCleared = useMemo(() => {
    return punchItems
      .filter((pi) => pi.clearedAt)
      .sort(
        (a, b) =>
          new Date(b.clearedAt!).getTime() - new Date(a.clearedAt!).getTime(),
      )
      .slice(0, 10);
  }, [punchItems]);

  const handleMarkCleared = async () => {
    if (selectedIds.size === 0) return;
    setIsClearing(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

    const ids = Array.from(selectedIds);
    // Auto-fill clearedBy from the team of the first selected item's request
    const firstItem = activeItems.find((pi) => pi.id === ids[0]);
    const req = clearanceRequests.find(
      (r) => r.id === firstItem?.clearanceRequestId,
    );
    const clearedBy = req?.assignedTo ?? "FT-01";

    markPunchItemsCleared(ids, clearedBy, today);

    // Get fresh state after mutation for notification cascade check
    const freshState = useTestpackStore.getState();
    const freshPunchItems = freshState.punchItems;
    const freshISOs = freshState.isos;
    const freshTestPacks = freshState.testPacks;

    // Check notification cascade: for each cleared X item, was it the last open X on its testpack?
    const clearedItems = freshPunchItems.filter((pi) => ids.includes(pi.id));
    const affectedTestPackIds = new Set<string>();

    for (const item of clearedItems) {
      if (item.category === "X") {
        const iso = freshISOs.find((i) => i.id === item.isoId);
        if (iso) {
          affectedTestPackIds.add(iso.testpackId);
        }
      }
    }

    for (const tpId of affectedTestPackIds) {
      // Check if this testpack has any remaining open X punch items
      const tpISOs = freshISOs.filter((i) => i.testpackId === tpId);
      const tpIsoIds = new Set(tpISOs.map((i) => i.id));
      const remainingOpenX = freshPunchItems.filter(
        (pi) => !pi.clearedAt && pi.category === "X" && tpIsoIds.has(pi.isoId),
      );
      if (remainingOpenX.length === 0) {
        const tp = freshTestPacks.find((t) => t.id === tpId);
        pushNotification({
          severity: "success",
          category: "system",
          title: `${tp?.no ?? tpId}: all category-X items cleared — ready for blinding`,
          description: `All category-X punch items on ${tp?.no ?? tpId} have been resolved. The test pack is one step closer to Ready For Test.`,
        });
      }
    }

    setIsClearing(false);
    setSelectedIds(new Set());

    toast.success(`Marked ${ids.length} punch items as cleared`);
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
      <TestpackWorkflowGuards />
      <div className="flex h-full gap-4 overflow-hidden">
        {/* Main */}
        <div className="flex-1 flex flex-col h-full overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Item Clearance Progress
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                {filtered.length} assigned
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Request filter */}
              <Select
                value={selectedRequest}
                onValueChange={setSelectedRequest}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Filter by ICR" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-slate-900 focus:bg-slate-100"
                  >
                    All requests
                  </SelectItem>
                  {clearanceRequests.map((req) => (
                    <SelectItem
                      key={req.id}
                      value={req.id}
                      className="text-slate-900 focus:bg-slate-100"
                    >
                      {req.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Testpack filter */}
              {selectedTestPack && selectedTestPack !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-700 border-sky-200 gap-1 cursor-pointer hover:bg-sky-100"
                  onClick={() => setSelectedTestPack("all")}
                >
                  testpack:{" "}
                  {testPacks.find((t) => t.id === selectedTestPack)?.no ??
                    selectedTestPack}
                  <X className="h-3 w-3" />
                </Badge>
              )}

              {/* Team filter */}
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[180px] h-8 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-slate-900 focus:bg-slate-100"
                  >
                    All teams
                  </SelectItem>
                  {finishingTeams.map((team) => (
                    <SelectItem
                      key={team.code}
                      value={team.code}
                      className="text-slate-900 focus:bg-slate-100"
                    >
                      {team.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search punch items…"
                  className="pl-8 h-8 w-48 bg-slate-50 border-slate-300 text-slate-900 text-xs placeholder:text-slate-500 focus-visible:ring-sky-600"
                />
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="px-5 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-4 flex-shrink-0">
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-red-600">{kpis.openX}</span>{" "}
              Open X
            </span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-amber-600">{kpis.openY}</span>{" "}
              Open Y
            </span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-slate-600">{kpis.openZ}</span>{" "}
              Open Z
            </span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-emerald-600">
                {kpis.clearedToday}
              </span>{" "}
              Cleared today
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">
                  No assigned punch items — all current work is cleared or not
                  yet assigned.
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
                      onClick={() => handleSort("assignedTo")}
                    >
                      <span className="inline-flex items-center">
                        Assigned-to
                        <SortIcon
                          active={sortCol === "assignedTo"}
                          dir={sortDir}
                        />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Assigned-on
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
                          <span className="text-xs text-slate-700 font-mono">
                            {row.assignedTo}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-slate-500">
                            {row.assignedOn
                              ? new Date(row.assignedOn).toLocaleDateString(
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

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-4 flex-shrink-0">
              <span className="text-sm text-slate-700">
                <span className="font-semibold">{selectedIds.size}</span> item
                {selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="h-4 w-px bg-slate-300" />
              <span className="text-sm text-slate-600">Cleared by:</span>
              <span className="text-xs text-slate-700 font-mono bg-white border border-slate-300 rounded px-2 py-1">
                {(() => {
                  const firstId = Array.from(selectedIds)[0];
                  const firstItem = activeItems.find((pi) => pi.id === firstId);
                  const req = clearanceRequests.find(
                    (r) => r.id === firstItem?.clearanceRequestId,
                  );
                  return req?.assignedTo ?? "FT-01";
                })()}
              </span>
              <span className="text-sm text-slate-600">Date:</span>
              <span className="text-xs text-slate-700 font-mono bg-white border border-slate-300 rounded px-2 py-1">
                {today}
              </span>
              <Button
                size="sm"
                disabled={isClearing || pmLocked}
                onClick={handleMarkCleared}
                className="h-8 text-xs gap-1.5"
              >
                {isClearing ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Mark Cleared
              </Button>
            </div>
          )}

          {/* Recently cleared */}
          {recentlyCleared.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Recently cleared ({recentlyCleared.length})
              </p>
              <div className="overflow-auto">
                <table className="w-full border-collapse text-sm min-w-[600px]">
                  <tbody>
                    {recentlyCleared.map((pi, i) => {
                      const iso = isos.find((iso) => iso.id === pi.isoId);
                      const tp = testPacks.find(
                        (t) => t.id === iso?.testpackId,
                      );
                      return (
                        <tr
                          key={pi.id}
                          className={cn(
                            "border-b border-slate-200",
                            i % 2 === 0 && "bg-white",
                            i % 2 !== 0 && "bg-slate-50",
                          )}
                        >
                          <td className="px-3 py-2 whitespace-nowrap w-[100px]">
                            <span className="text-xs text-slate-400 font-mono line-through">
                              {pi.id}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[80px]">
                            <span className="text-xs text-slate-400 font-mono line-through">
                              {pi.code}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-xs text-slate-400 line-through">
                              {pi.description}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[40px]">
                            <CategoryBadge category={pi.category} />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[100px]">
                            <span className="text-xs text-slate-400 font-mono">
                              {pi.isoId}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[100px]">
                            <span className="text-xs text-slate-400 font-mono">
                              {tp?.no ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[100px]">
                            <span className="text-xs text-slate-400">
                              {pi.clearedBy}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[100px]">
                            <span className="text-xs text-slate-400">
                              {pi.clearedAt
                                ? new Date(pi.clearedAt).toLocaleDateString(
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
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
