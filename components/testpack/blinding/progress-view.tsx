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
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useTestpackStore, useNotificationsStore, useTeams } from "@/store";
import { type TestPackRecord } from "@/lib/testpack-seed";

import { Button } from "@/components/ui/button";
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    Assigned: "bg-amber-100 text-amber-800 border border-amber-300",
    Done: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  };
  const cls =
    config[status] ?? "bg-slate-100 text-slate-700 border border-slate-300";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        cls,
      )}
    >
      {status}
    </span>
  );
}

export function ProgressView() {
  const searchParams = useSearchParams();
  const requestFilter = searchParams.get("request") ?? "";
  const teamFilter = searchParams.get("team") ?? "";
  const testpackParam = searchParams.get("testpack") ?? "";

  const testPacks = useTestpackStore((s) => s.testPacks);
  const blindingRequests = useTestpackStore((s) => s.blindingRequests);
  const recordBlindingDate = useTestpackStore((s) => s.recordBlindingDate);
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const blindingTeams = useTeams("blinding");

  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>(teamFilter || "all");
  const [testpackFilter, setTestpackFilter] = useState<string>(
    testpackParam || "all",
  );
  const [selectedTestPack, setSelectedTestPack] =
    useState<TestPackRecord | null>(null);
  const [sortCol, setSortCol] = useState<"no" | "system" | "assignedTo" | null>(
    null,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const [blindingDate, setBlindingDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Assigned testpacks
  const activeTestPacks = useMemo(() => {
    return testPacks.filter((tp) => tp.blindingStatus === "Assigned");
  }, [testPacks]);

  const filtered = useMemo(() => {
    let rows = activeTestPacks.map((tp) => {
      const req = blindingRequests.find((r) => r.id === tp.blindingRequestId);
      const teamName =
        blindingTeams.find((t) => t.code === req?.assignedTo)?.name ??
        req?.assignedTo ??
        "";
      return {
        ...tp,
        assignedTo: tp.blindingAssignedTo ?? "",
        assignedOn: req?.createdAt ?? "",
        assignedToLabel: teamName,
      };
    });

    if (requestFilter) {
      rows = rows.filter((r) => r.blindingRequestId === requestFilter);
    }
    if (selectedTeam && selectedTeam !== "all") {
      rows = rows.filter((r) => r.assignedTo === selectedTeam);
    }
    if (testpackFilter && testpackFilter !== "all") {
      rows = rows.filter((r) => r.id === testpackFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.no.toLowerCase().includes(q) ||
          r.system.toLowerCase().includes(q) ||
          r.assignedTo.toLowerCase().includes(q),
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
    activeTestPacks,
    blindingRequests,
    requestFilter,
    selectedTeam,
    testpackFilter,
    search,
    sortCol,
    sortDir,
  ]);

  const handleSort = (col: "no" | "system" | "assignedTo") => {
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

  const assignedCount = activeTestPacks.length;
  const doneCount = testPacks.filter(
    (tp) => tp.blindingStatus === "Done",
  ).length;

  const recentlyBlinded = useMemo(() => {
    return testPacks
      .filter((tp) => tp.blindingStatus === "Done" && tp.blindingDate)
      .sort(
        (a, b) =>
          new Date(b.blindingDate!).getTime() -
          new Date(a.blindingDate!).getTime(),
      )
      .slice(0, 10);
  }, [testPacks]);

  const openPanel = (tp: TestPackRecord) => {
    setSelectedTestPack(tp);
    setBlindingDate(today);
  };

  const closePanel = () => {
    setSelectedTestPack(null);
    setBlindingDate("");
  };

  const handleSave = async () => {
    if (!selectedTestPack || !blindingDate) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

    recordBlindingDate(selectedTestPack.id, blindingDate);

    pushNotification({
      severity: "success",
      category: "system",
      title: `${selectedTestPack.no}: blinded — ready for hydrotest`,
      description: `Blinding recorded on ${blindingDate}. Test pack is ready for pressure testing.`,
      href: `/testpack/pressure-test/testing-precomm/progress`,
    });

    toast.success(`${selectedTestPack.no}: blinding recorded`);
    setIsSaving(false);
    closePanel();
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
        {/* Main */}
        <div className="flex-1 flex flex-col h-full overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-violet-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Blinding Progress
              </h2>
              <span className="text-xs text-slate-500">
                {filtered.length} active
              </span>
              {testpackFilter && testpackFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-700 border-sky-200 gap-1 cursor-pointer hover:bg-sky-100"
                  onClick={() => setTestpackFilter("all")}
                >
                  testpack:{" "}
                  {testPacks.find((t) => t.id === testpackFilter)?.no ??
                    testpackFilter}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="h-8 text-sm bg-white border-slate-300 w-[160px]">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem value="all" className="text-sm">
                    All teams
                  </SelectItem>
                  {blindingTeams.map((t) => (
                    <SelectItem key={t.code} value={t.code} className="text-sm">
                      {t.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 w-48 text-sm bg-white border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="px-5 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-4 flex-shrink-0">
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-amber-600">
                {assignedCount}
              </span>{" "}
              Assigned
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-emerald-600">
                {doneCount}
              </span>{" "}
              Done
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="border-b border-slate-200">
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
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Location
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Priority
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer select-none"
                    onClick={() => handleSort("assignedTo")}
                  >
                    <span className="flex items-center">
                      Assigned To
                      <SortIcon
                        active={sortCol === "assignedTo"}
                        dir={sortDir}
                      />
                    </span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      No testpacks currently assigned for blinding.
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => openPanel(row)}
                  >
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {row.no}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.system}</td>
                    <td className="px-3 py-2 text-slate-700">{row.location}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          row.priority === "High"
                            ? "border-red-300 text-red-700 bg-red-50"
                            : row.priority === "Medium"
                              ? "border-amber-300 text-amber-700 bg-amber-50"
                              : "border-slate-300 text-slate-700 bg-slate-50",
                        )}
                      >
                        {row.priority}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.assignedToLabel || row.assignedTo}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.blindingStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recently blinded */}
          {recentlyBlinded.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Recently blinded
              </p>
              <div className="flex flex-wrap gap-2">
                {recentlyBlinded.map((tp) => (
                  <span
                    key={tp.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs text-slate-600"
                  >
                    <span className="font-medium text-slate-800">{tp.no}</span>
                    <span className="text-slate-400">·</span>
                    <span>{tp.blindingDate}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {selectedTestPack && (
          <aside className="w-[380px] flex-shrink-0 rounded-xl border border-slate-200 bg-white flex flex-col h-full overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-slate-900">
                  Record Blinding
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePanel}
                className="h-7 w-7 p-0"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-4 w-4 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Testpack</span>
                  <span className="font-medium text-slate-900">
                    {selectedTestPack.no}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">System</span>
                  <span className="text-slate-700">
                    {selectedTestPack.system}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Location</span>
                  <span className="text-slate-700">
                    {selectedTestPack.location}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Priority</span>
                  <span className="text-slate-700">
                    {selectedTestPack.priority}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Assigned to</span>
                  <span className="text-slate-700">
                    {selectedTestPack.blindingAssignedTo}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Assigned on</span>
                  <span className="text-slate-700">
                    {blindingRequests
                      .find((r) => r.id === selectedTestPack.blindingRequestId)
                      ?.createdAt.slice(0, 10)}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200" />

              {/* Blinding date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  Blinding date
                </Label>
                <Input
                  type="date"
                  value={blindingDate}
                  onChange={(e) => setBlindingDate(e.target.value)}
                  className="h-9 text-sm bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-5 py-3 border-t border-slate-200 flex-shrink-0 bg-slate-50">
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                disabled={!blindingDate || isSaving}
                onClick={handleSave}
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Save blinding record
                  </span>
                )}
              </Button>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
