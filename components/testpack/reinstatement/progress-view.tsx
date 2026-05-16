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

import {
  useTestpackStore,
  useNotificationsStore,
  useReinstatementKPIs,
  useTeams,
  useAllTeams,
} from "@/store";
import { type PunchCategory } from "@/lib/testpack-seed";

import { Badge } from "@/components/ui/badge";
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
  const searchParams = useSearchParams();
  const requestFilter = searchParams.get("request") ?? "";
  const teamFilter = searchParams.get("team") ?? "";
  const testpackParam = searchParams.get("testpack") ?? "";

  const punchItems = useTestpackStore((s) => s.punchItems);
  const testPacks = useTestpackStore((s) => s.testPacks);
  const isos = useTestpackStore((s) => s.isos);
  const reinstatementRequests = useTestpackStore(
    (s) => s.reinstatementRequests,
  );
  const markReinstated = useTestpackStore((s) => s.markReinstated);
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const kpis = useReinstatementKPIs();
  const reinstatementTeams = useTeams("reinstatement");
  const allReinstatementTeams = useAllTeams("reinstatement");
  const jointerTeams = useTeams("jointer");

  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>(teamFilter || "all");
  const [selectedRequest, setSelectedRequest] = useState<string>(
    requestFilter || "all",
  );
  const [selectedTestPack, setSelectedTestPack] = useState<string>(
    testpackParam || "all",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [sortCol, setSortCol] = useState<
    "id" | "code" | "isoId" | "testpack" | "assignedTo" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [formState, setFormState] = useState({
    date: today,
    reportNo: "",
    jointerNo: "",
    tagNo: "",
  });

  const activeItems = useMemo(() => {
    return punchItems.filter(
      (pi) => pi.reinstatementRequestId && !pi.reinstatedAt,
    );
  }, [punchItems]);

  const filtered = useMemo(() => {
    let rows = activeItems.map((pi) => {
      const iso = isos.find((i) => i.id === pi.isoId);
      const tp = testPacks.find((t) => t.id === iso?.testpackId);
      const req = reinstatementRequests.find(
        (r) => r.id === pi.reinstatementRequestId,
      );
      const teamName =
        allReinstatementTeams.find((t) => t.code === req?.assignedTo)?.name ??
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
      rows = rows.filter((r) => r.reinstatementRequestId === selectedRequest);
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
    reinstatementRequests,
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

  const recentlyReinstated = useMemo(() => {
    return punchItems
      .filter((pi) => pi.reinstatedAt)
      .sort(
        (a, b) =>
          new Date(b.reinstatedAt!).getTime() -
          new Date(a.reinstatedAt!).getTime(),
      )
      .slice(0, 10);
  }, [punchItems]);

  const selectedItem = useMemo(() => {
    return filtered.find((r) => r.id === selectedItemId);
  }, [filtered, selectedItemId]);

  const canSave =
    formState.date &&
    formState.reportNo.trim() &&
    formState.jointerNo &&
    formState.tagNo.trim();

  const handleSaveReinstatement = async () => {
    if (!selectedItem || !canSave) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

    const req = reinstatementRequests.find(
      (r) => r.id === selectedItem.reinstatementRequestId,
    );

    markReinstated(selectedItem.id, {
      date: formState.date,
      reportNo: formState.reportNo,
      jointerNo: formState.jointerNo,
      tagNo: formState.tagNo,
      reinstatedBy: req?.assignedTo ?? "RT-01",
    });

    // Notification cascade: check if this was the last open Y/Z item on its testpack
    const freshState = useTestpackStore.getState();
    const freshPunchItems = freshState.punchItems;
    const freshISOs = freshState.isos;
    const freshTestPacks = freshState.testPacks;

    const iso = freshISOs.find((i) => i.id === selectedItem.isoId);
    const tpId = iso?.testpackId;
    if (tpId) {
      const tpISOs = freshISOs.filter((i) => i.testpackId === tpId);
      const tpIsoIds = new Set(tpISOs.map((i) => i.id));
      const remainingOpenYZ = freshPunchItems.filter(
        (pi) =>
          !pi.reinstatedAt &&
          (pi.category === "Y" || pi.category === "Z") &&
          tpIsoIds.has(pi.isoId),
      );
      if (remainingOpenYZ.length === 0) {
        const tp = freshTestPacks.find((t) => t.id === tpId);
        pushNotification({
          severity: "success",
          category: "system",
          title: `${tp?.no ?? tpId}: reinstatement complete — ready for commissioning`,
          description: `All Y and Z items on ${tp?.no ?? tpId} have been reinstated.`,
        });
      }
    }

    toast.success(`Punch ${selectedItem.id} reinstated`);

    setIsSaving(false);
    setSelectedItemId(null);
    setFormState({
      date: today,
      reportNo: "",
      jointerNo: "",
      tagNo: "",
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
        {/* Main */}
        <div className="flex-1 flex flex-col h-full overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Reinstatement Progress
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 border border-sky-300">
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
                  <SelectValue placeholder="Filter by RR" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-slate-900 focus:bg-slate-100"
                  >
                    All requests
                  </SelectItem>
                  {reinstatementRequests.map((req) => (
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
                  {reinstatementTeams.map((team) => (
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
              <span className="font-semibold text-amber-600">
                {kpis.eligibleY}
              </span>{" "}
              Eligible Y
            </span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-slate-600">
                {kpis.eligibleZ}
              </span>{" "}
              Eligible Z
            </span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-sky-600">
                {kpis.assignedCount}
              </span>{" "}
              In Progress
            </span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-emerald-600">
                {kpis.doneCount}
              </span>{" "}
              Done
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">
                  No assigned reinstatement items.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-sm min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100 border-b border-slate-200">
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
                        Assigned To
                        <SortIcon
                          active={sortCol === "assignedTo"}
                          dir={sortDir}
                        />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Assigned On
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer",
                        selectedItemId === row.id && "bg-sky-50",
                      )}
                      onClick={() => {
                        setSelectedItemId(row.id);
                        setFormState({
                          date: today,
                          reportNo: "",
                          jointerNo: "",
                          tagNo: "",
                        });
                      }}
                    >
                      <td className="px-3 py-2 text-xs font-medium text-slate-900 whitespace-nowrap">
                        {row.id}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 max-w-[200px] truncate">
                        {row.description}
                      </td>
                      <td className="px-3 py-2">
                        <CategoryBadge category={row.category} />
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                        {row.isoId}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                        {row.testPackName}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                        {row.assignedToLabel || row.assignedTo}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(row.assignedOn).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recently reinstated */}
          {recentlyReinstated.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Recently Reinstated
              </h3>
              <div className="flex gap-2 overflow-x-auto">
                {recentlyReinstated.map((pi) => (
                  <div
                    key={pi.id}
                    className="flex-shrink-0 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                  >
                    <div className="font-medium text-slate-900">{pi.id}</div>
                    <div className="text-slate-500">
                      {pi.reinstatedAt
                        ? new Date(pi.reinstatedAt).toLocaleDateString()
                        : ""}{" "}
                      · {pi.jointerNo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {selectedItem && (
          <aside className="w-[360px] flex-shrink-0 rounded-xl border border-slate-200 bg-white flex flex-col h-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Reinstatement Record
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-slate-500"
                onClick={() => setSelectedItemId(null)}
              >
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Read-only info */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Punch ID</span>
                  <span className="font-medium text-slate-900">
                    {selectedItem.id}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Code</span>
                  <span className="font-medium text-slate-900">
                    {selectedItem.code}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Description</span>
                  <span className="font-medium text-slate-900 text-right max-w-[180px]">
                    {selectedItem.description}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Category</span>
                  <CategoryBadge category={selectedItem.category} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">ISO</span>
                  <span className="font-medium text-slate-900">
                    {selectedItem.isoId}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Testpack</span>
                  <span className="font-medium text-slate-900">
                    {selectedItem.testPackName}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Assigned to</span>
                  <span className="font-medium text-slate-900">
                    {selectedItem.assignedToLabel || selectedItem.assignedTo}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Assigned on</span>
                  <span className="font-medium text-slate-900">
                    {new Date(selectedItem.assignedOn).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Joint Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formState.date}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, date: e.target.value }))
                    }
                    className="mt-1 h-8 text-xs bg-white border-slate-300 text-slate-900 focus-visible:ring-sky-600"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Report No <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formState.reportNo}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        reportNo: e.target.value,
                      }))
                    }
                    placeholder="e.g. RPT-001"
                    className="mt-1 h-8 text-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-600"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Jointer No <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formState.jointerNo}
                    onValueChange={(v) =>
                      setFormState((s) => ({ ...s, jointerNo: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs bg-white border-slate-300">
                      <SelectValue placeholder="Select jointer" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {jointerTeams.map((j) => (
                        <SelectItem
                          key={j.code}
                          value={j.code}
                          className="text-slate-900 focus:bg-slate-100"
                        >
                          {j.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Tag No <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formState.tagNo}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, tagNo: e.target.value }))
                    }
                    placeholder="e.g. T-001"
                    className="mt-1 h-8 text-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-600"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200">
              <Button
                className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                disabled={!canSave || isSaving}
                onClick={handleSaveReinstatement}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5" />
                    Save Reinstatement Record
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
