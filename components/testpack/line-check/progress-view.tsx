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
  ClipboardList,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  useTestpackStore,
  useNotificationsStore,
  LINE_CHECKER_TEAMS,
} from "@/store";
import {
  type PunchItem,
  type ISORecord,
  PUNCH_CODES,
  SEED_ISO_SPOOLS,
} from "@/lib/testpack-seed";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    InProgress: "bg-sky-100 text-sky-800 border border-sky-300",
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

interface PunchItemFormRow {
  tempId: string;
  code: string;
  description: string;
  category: "X" | "Y" | "Z";
  localization: "iso" | "spool";
  spoolId?: string;
  originator: string;
}

export function ProgressView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestFilter = searchParams.get("request") ?? "";
  const teamFilter = searchParams.get("team") ?? "";
  const testpackParam = searchParams.get("testpack") ?? "";

  const isos = useTestpackStore((s) => s.isos);
  const testPacks = useTestpackStore((s) => s.testPacks);
  const checkingRequests = useTestpackStore((s) => s.checkingRequests);
  const recordLineCheck = useTestpackStore((s) => s.recordLineCheck);
  const pushNotification = useNotificationsStore((s) => s.pushNotification);

  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>(teamFilter || "all");
  const [selectedTestPack, setSelectedTestPack] = useState<string>(
    testpackParam || "all",
  );
  const [selectedISO, setSelectedISO] = useState<ISORecord | null>(null);
  const [sortCol, setSortCol] = useState<
    "id" | "testpack" | "assignedTo" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const [checkDate, setCheckDate] = useState("");
  const [punchRows, setPunchRows] = useState<PunchItemFormRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Filter assigned / in-progress ISOs
  const activeISOs = useMemo(() => {
    return isos.filter(
      (iso) =>
        iso.lineCheckStatus === "Assigned" ||
        iso.lineCheckStatus === "InProgress",
    );
  }, [isos]);

  const filtered = useMemo(() => {
    let rows = activeISOs.map((iso) => {
      const tp = testPacks.find((t) => t.id === iso.testpackId);
      const req = checkingRequests.find((r) => r.id === iso.lineCheckRequestId);
      return {
        ...iso,
        testPackName: tp?.no ?? iso.testpackId,
        testpackId: iso.testpackId,
        assignedTo: iso.lineCheckAssignedTo ?? "",
        assignedOn: req?.createdAt ?? "",
      };
    });

    if (requestFilter) {
      rows = rows.filter((r) => r.lineCheckRequestId === requestFilter);
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
          r.testPackName.toLowerCase().includes(q) ||
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
    activeISOs,
    testPacks,
    checkingRequests,
    requestFilter,
    selectedTeam,
    selectedTestPack,
    search,
    sortCol,
    sortDir,
  ]);

  const handleSort = (col: "id" | "testpack" | "assignedTo") => {
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

  const assignedCount = activeISOs.filter(
    (iso) => iso.lineCheckStatus === "Assigned",
  ).length;
  const inProgressCount = activeISOs.filter(
    (iso) => iso.lineCheckStatus === "InProgress",
  ).length;
  const doneCount = isos.filter((iso) => iso.lineCheckStatus === "Done").length;
  const doneISOs = isos.filter((iso) => iso.lineCheckStatus === "Done");

  const isoSpools = useMemo(() => {
    if (!selectedISO) return [];
    return (
      SEED_ISO_SPOOLS.find((s) => s.isoId === selectedISO.id)?.spoolIds ?? []
    );
  }, [selectedISO]);

  const openPanel = (iso: ISORecord) => {
    setSelectedISO(iso);
    setCheckDate("");
    setPunchRows([]);
  };

  const closePanel = () => {
    setSelectedISO(null);
    setCheckDate("");
    setPunchRows([]);
  };

  const addPunchRow = () => {
    const team = selectedISO?.lineCheckAssignedTo ?? LINE_CHECKER_TEAMS[0];
    setPunchRows((prev) => [
      ...prev,
      {
        tempId: `tmp-${Date.now()}-${prev.length}`,
        code: PUNCH_CODES[0].code,
        description: PUNCH_CODES[0].description,
        category: PUNCH_CODES[0].defaultCategory,
        localization: "iso",
        originator: team,
      },
    ]);
  };

  const updatePunchRow = (tempId: string, patch: Partial<PunchItemFormRow>) => {
    setPunchRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        const next = { ...row, ...patch };
        if (patch.code) {
          const codeInfo = PUNCH_CODES.find((c) => c.code === patch.code);
          if (codeInfo) {
            next.description = codeInfo.description;
            next.category = codeInfo.defaultCategory;
          }
        }
        return next;
      }),
    );
  };

  const removePunchRow = (tempId: string) => {
    setPunchRows((prev) => prev.filter((row) => row.tempId !== tempId));
  };

  const handleSave = async () => {
    if (!selectedISO || !checkDate) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

    const payloadPunchItems: Omit<PunchItem, "id" | "createdAt" | "isoId">[] =
      punchRows.map((row) => ({
        code: row.code,
        description: row.description,
        category: row.category,
        isoId: selectedISO.id,
        spoolId: row.localization === "spool" ? row.spoolId : undefined,
        originator: row.originator,
      }));

    recordLineCheck(selectedISO.id, {
      date: checkDate,
      punchItems: payloadPunchItems,
    });

    const tp = testPacks.find((t) => t.id === selectedISO.testpackId);
    const xCount = punchRows.filter((r) => r.category === "X").length;

    if (xCount > 0) {
      pushNotification({
        severity: "warning",
        category: "system",
        title: `ISO ${selectedISO.id} line check done — ${xCount} category-X item${xCount !== 1 ? "s" : ""} blocking ${tp?.no ?? selectedISO.testpackId}`,
        description: `${xCount} punch item(s) must be cleared before the testpack can proceed to test.`,
        href: `/testpack/pressure-test/line-check/progress`,
        actorLabel: selectedISO.lineCheckAssignedTo ?? "LC-01",
      });
    } else {
      pushNotification({
        severity: "success",
        category: "system",
        title: `ISO ${selectedISO.id} line check complete · 0 blocking items`,
        description: `Line check recorded on ${checkDate}. No category-X punch items.`,
        href: `/testpack/pressure-test/line-check/progress`,
        actorLabel: selectedISO.lineCheckAssignedTo ?? "LC-01",
      });
    }

    toast.success(`ISO ${selectedISO.id} line check recorded`);
    setIsSaving(false);
    closePanel();
  };

  const isDateInvalid =
    !checkDate || Number.isNaN(new Date(checkDate).getTime());

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
          {/* Top bar */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Line Check Progress
              </h2>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* KPI strip */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-700">
                  <span className="font-semibold text-amber-600">
                    {assignedCount}
                  </span>{" "}
                  Assigned
                </span>
                <span className="text-slate-700">
                  <span className="font-semibold text-sky-600">
                    {inProgressCount}
                  </span>{" "}
                  In Progress
                </span>
                <span className="text-slate-700">
                  <span className="font-semibold text-emerald-600">
                    {doneCount}
                  </span>{" "}
                  Done
                </span>
              </div>

              <div className="h-4 w-px bg-slate-300" />

              {/* Request filter chip */}
              {requestFilter && (
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-700 border-sky-200 gap-1 cursor-pointer hover:bg-sky-100"
                  onClick={() =>
                    router.push("/testpack/pressure-test/line-check/progress")
                  }
                >
                  {requestFilter}
                  <X className="h-3 w-3" />
                </Badge>
              )}

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
                <SelectTrigger className="w-[140px] h-8 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300">
                  <SelectItem
                    value="all"
                    className="text-slate-900 focus:bg-slate-100"
                  >
                    All teams
                  </SelectItem>
                  {LINE_CHECKER_TEAMS.map((team) => (
                    <SelectItem
                      key={team}
                      value={team}
                      className="text-slate-900 focus:bg-slate-100"
                    >
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ISOs…"
                  className="pl-8 h-8 w-48 bg-slate-50 border-slate-300 text-slate-900 text-xs placeholder:text-slate-500 focus-visible:ring-sky-600"
                />
              </div>
            </div>
          </div>

          {/* Active table */}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">
                  No assigned ISOs — all current work is completed or not yet
                  assigned.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-sm min-w-[600px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors"
                      onClick={() => handleSort("id")}
                    >
                      <span className="inline-flex items-center">
                        ISO ID
                        <SortIcon active={sortCol === "id"} dir={sortDir} />
                      </span>
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-900 transition-colors"
                      onClick={() => handleSort("testpack")}
                    >
                      <span className="inline-flex items-center">
                        Test Pack
                        <SortIcon
                          active={sortCol === "testpack"}
                          dir={sortDir}
                        />
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Assigned To
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Assigned On
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr
                      key={row.id}
                      onClick={() => openPanel(row)}
                      className={cn(
                        "border-b border-slate-200 cursor-pointer transition-colors",
                        i % 2 === 0 && "bg-white",
                        i % 2 !== 0 && "bg-slate-50",
                        selectedISO?.id === row.id &&
                          "bg-sky-100 border-sky-300",
                        "hover:bg-slate-100",
                      )}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-sky-600 text-xs font-mono">
                          {row.id}
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
                        <span className="text-xs text-slate-600">
                          {row.assignedOn
                            ? new Date(row.assignedOn).toLocaleDateString(
                                "en-GB",
                              )
                            : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge status={row.lineCheckStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Completed section */}
          {doneISOs.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Completed ({doneISOs.length})
              </p>
              <div className="overflow-auto">
                <table className="w-full border-collapse text-sm min-w-[600px]">
                  <tbody>
                    {doneISOs.map((iso, i) => {
                      const tp = testPacks.find((t) => t.id === iso.testpackId);
                      return (
                        <tr
                          key={iso.id}
                          onClick={() => openPanel(iso)}
                          className={cn(
                            "border-b border-slate-200 cursor-pointer transition-colors",
                            i % 2 === 0 && "bg-white",
                            i % 2 !== 0 && "bg-slate-50",
                            selectedISO?.id === iso.id &&
                              "bg-sky-100 border-sky-300",
                            "hover:bg-slate-100",
                          )}
                        >
                          <td className="px-3 py-2 whitespace-nowrap w-[180px]">
                            <span className="font-semibold text-sky-600 text-xs font-mono">
                              {iso.id}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[140px]">
                            <span className="text-xs text-slate-700 font-mono">
                              {tp?.no ?? iso.testpackId}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[120px]">
                            <span className="text-xs text-slate-700 font-mono">
                              {iso.lineCheckAssignedTo ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap w-[120px]">
                            <span className="text-xs text-slate-600">
                              {iso.lineCheckDate ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <StatusBadge status={iso.lineCheckStatus} />
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

        {/* Side panel */}
        {selectedISO && (
          <aside className="w-[420px] flex-shrink-0 rounded-xl border border-slate-200 bg-white flex flex-col h-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-slate-900 font-mono">
                  {selectedISO.id}
                </span>
                <span className="text-xs text-slate-500">
                  {selectedISO.testpackId}
                </span>
              </div>
              <button
                onClick={closePanel}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {/* Readonly metadata */}
              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
                  ISO Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      Test Pack
                    </Label>
                    <div className="h-8 px-3 flex items-center rounded border border-slate-200 bg-slate-50 text-xs text-slate-700 font-mono">
                      {selectedISO.testpackId}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      Assigned To
                    </Label>
                    <div className="h-8 px-3 flex items-center rounded border border-slate-200 bg-slate-50 text-xs text-slate-700 font-mono">
                      {selectedISO.lineCheckAssignedTo ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      Spools Supported
                    </Label>
                    <div className="h-8 px-3 flex items-center rounded border border-slate-200 bg-slate-50 text-xs text-slate-700">
                      {selectedISO.spoolsSupported ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      All Welds Welded
                    </Label>
                    <div className="h-8 px-3 flex items-center rounded border border-slate-200 bg-slate-50 text-xs text-slate-700">
                      {selectedISO.allWeldsWelded ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
                  Line Check Record
                </p>
                <div className="flex flex-col gap-4">
                  {/* Check date */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Check Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={checkDate}
                      onChange={(e) => setCheckDate(e.target.value)}
                      className="h-8 text-xs bg-white border-slate-300 focus-visible:ring-sky-600"
                    />
                    {isDateInvalid && checkDate && (
                      <p className="text-[11px] text-red-600">Invalid date</p>
                    )}
                  </div>

                  {/* Punch items */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Punch Items
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={addPunchRow}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add punch item
                      </Button>
                    </div>

                    {punchRows.length === 0 && (
                      <p className="text-xs text-slate-400 italic">
                        No punch items added
                      </p>
                    )}

                    <div className="flex flex-col gap-3">
                      {punchRows.map((row) => (
                        <div
                          key={row.tempId}
                          className="p-3 rounded border border-slate-200 bg-slate-50 flex flex-col gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <Select
                              value={row.code}
                              onValueChange={(v) =>
                                updatePunchRow(row.tempId, { code: v })
                              }
                            >
                              <SelectTrigger className="w-[120px] h-7 text-xs bg-white border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-300">
                                {PUNCH_CODES.map((pc) => (
                                  <SelectItem
                                    key={pc.code}
                                    value={pc.code}
                                    className="text-slate-900 focus:bg-slate-100 text-xs"
                                  >
                                    {pc.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              value={row.description}
                              onChange={(e) =>
                                updatePunchRow(row.tempId, {
                                  description: e.target.value,
                                })
                              }
                              className="flex-1 h-7 text-xs bg-white border-slate-300"
                              placeholder="Description"
                            />

                            <button
                              onClick={() => removePunchRow(row.tempId)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <RadioGroup
                              value={row.category}
                              onValueChange={(v) =>
                                updatePunchRow(row.tempId, {
                                  category: v as "X" | "Y" | "Z",
                                })
                              }
                              className="flex items-center gap-3"
                            >
                              <div className="flex items-center gap-1.5">
                                <RadioGroupItem
                                  value="X"
                                  id={`cat-x-${row.tempId}`}
                                  className="h-3.5 w-3.5"
                                />
                                <Label
                                  htmlFor={`cat-x-${row.tempId}`}
                                  className="text-xs text-slate-700 cursor-pointer"
                                >
                                  X
                                </Label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <RadioGroupItem
                                  value="Y"
                                  id={`cat-y-${row.tempId}`}
                                  className="h-3.5 w-3.5"
                                />
                                <Label
                                  htmlFor={`cat-y-${row.tempId}`}
                                  className="text-xs text-slate-700 cursor-pointer"
                                >
                                  Y
                                </Label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <RadioGroupItem
                                  value="Z"
                                  id={`cat-z-${row.tempId}`}
                                  className="h-3.5 w-3.5"
                                />
                                <Label
                                  htmlFor={`cat-z-${row.tempId}`}
                                  className="text-xs text-slate-700 cursor-pointer"
                                >
                                  Z
                                </Label>
                              </div>
                            </RadioGroup>

                            <Select
                              value={row.localization}
                              onValueChange={(v) =>
                                updatePunchRow(row.tempId, {
                                  localization: v as "iso" | "spool",
                                })
                              }
                            >
                              <SelectTrigger className="w-[100px] h-7 text-xs bg-white border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-300">
                                <SelectItem
                                  value="iso"
                                  className="text-xs focus:bg-slate-100"
                                >
                                  ISO
                                </SelectItem>
                                <SelectItem
                                  value="spool"
                                  className="text-xs focus:bg-slate-100"
                                >
                                  Spool
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {row.localization === "spool" && (
                              <Select
                                value={row.spoolId ?? ""}
                                onValueChange={(v) =>
                                  updatePunchRow(row.tempId, { spoolId: v })
                                }
                              >
                                <SelectTrigger className="w-[120px] h-7 text-xs bg-white border-slate-300">
                                  <SelectValue placeholder="Spool" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-300">
                                  {isoSpools.map((spoolId) => (
                                    <SelectItem
                                      key={spoolId}
                                      value={spoolId}
                                      className="text-xs focus:bg-slate-100"
                                    >
                                      {spoolId}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            <Input
                              value={row.originator}
                              onChange={(e) =>
                                updatePunchRow(row.tempId, {
                                  originator: e.target.value,
                                })
                              }
                              className="w-[100px] h-7 text-xs bg-white border-slate-300"
                              placeholder="Originator"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={closePanel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isDateInvalid || isSaving}
                onClick={handleSave}
                className="h-8 text-xs gap-1.5"
              >
                {isSaving ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
