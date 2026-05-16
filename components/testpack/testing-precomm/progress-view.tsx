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
  FlaskConical,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  useTestpackStore,
  useNotificationsStore,
  useTestingKPIs,
} from "@/store";
import { type TestPackRecord } from "@/lib/testpack-seed";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "\u2014";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function ProgressView() {
  const searchParams = useSearchParams();
  const testpackParam = searchParams.get("testpack") ?? "";

  const testPacks = useTestpackStore((s) => s.testPacks);
  const setTestingDates = useTestpackStore((s) => s.setTestingDates);
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const kpis = useTestingKPIs();

  const [search, setSearch] = useState("");
  const [testpackFilter, setTestpackFilter] = useState<string>(
    testpackParam || "all",
  );
  const [selectedTestPack, setSelectedTestPack] =
    useState<TestPackRecord | null>(null);
  const [sortCol, setSortCol] = useState<
    "no" | "system" | "blindedDate" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const [testingStartDate, setTestingStartDate] = useState("");
  const [testingDoneDate, setTestingDoneDate] = useState("");
  const [preCommDate, setPreCommDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const relevantTestPacks = useMemo(() => {
    return testPacks.filter((tp) => tp.blindingStatus === "Done");
  }, [testPacks]);

  const filtered = useMemo(() => {
    let rows = relevantTestPacks;

    if (testpackFilter && testpackFilter !== "all") {
      rows = rows.filter((r) => r.id === testpackFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.no.toLowerCase().includes(q) ||
          r.system.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q),
      );
    }

    if (sortCol && sortDir) {
      rows = [...rows].sort((a, b) => {
        let av: string;
        let bv: string;
        if (sortCol === "blindedDate") {
          av = a.blindingDate ?? "";
          bv = b.blindingDate ?? "";
        } else {
          av = String(a[sortCol as keyof typeof a] ?? "");
          bv = String(b[sortCol as keyof typeof b] ?? "");
        }
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return rows;
  }, [relevantTestPacks, testpackFilter, search, sortCol, sortDir]);

  const handleSort = (col: "no" | "system" | "blindedDate") => {
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

  const openPanel = (tp: TestPackRecord) => {
    setSelectedTestPack(tp);
    setTestingStartDate(tp.testingStartDate ?? "");
    setTestingDoneDate(tp.testingDoneDate ?? "");
    setPreCommDate(tp.preCommDate ?? "");
  };

  const closePanel = () => {
    setSelectedTestPack(null);
    setTestingStartDate("");
    setTestingDoneDate("");
    setPreCommDate("");
  };

  const handleSave = async () => {
    if (!selectedTestPack) return;

    // Validation
    if (testingDoneDate && !testingStartDate) {
      toast.error("Testing start date is required before setting done date.");
      return;
    }
    if (preCommDate && !testingDoneDate) {
      toast.error(
        "Testing done date is required before setting pre-comm date.",
      );
      return;
    }
    if (
      testingDoneDate &&
      testingStartDate &&
      new Date(testingDoneDate) < new Date(testingStartDate)
    ) {
      toast.error("Testing done date must be on or after start date.");
      return;
    }
    if (
      preCommDate &&
      testingDoneDate &&
      new Date(preCommDate) < new Date(testingDoneDate)
    ) {
      toast.error("Pre-comm date must be on or after testing done date.");
      return;
    }

    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

    const hadTestingDoneDate = !!selectedTestPack.testingDoneDate;
    const hadPreCommDate = !!selectedTestPack.preCommDate;

    setTestingDates(selectedTestPack.id, {
      testingStartDate: testingStartDate || undefined,
      testingDoneDate: testingDoneDate || undefined,
      preCommDate: preCommDate || undefined,
    });

    // Notification cascade
    if (testingDoneDate && !hadTestingDoneDate) {
      pushNotification({
        severity: "success",
        category: "system",
        title: `${selectedTestPack.no}: hydrotest passed (pressure held — ready for pre-commissioning)`,
        description: `Testing completed on ${testingDoneDate}. The test pack has passed hydrotest and is ready for pre-commissioning.`,
        href: `/testpack/pressure-test/testing-precomm/progress`,
      });
    }

    if (preCommDate && !hadPreCommDate) {
      pushNotification({
        severity: "success",
        category: "system",
        title: `${selectedTestPack.no}: pre-commissioning complete`,
        description: `Pre-commissioning recorded on ${preCommDate}.`,
        href: `/testpack/pressure-test/testing-precomm/progress`,
      });
    }

    toast.success(`${selectedTestPack.no}: dates updated`);
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
              <FlaskConical className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Testing &amp; Pre-commissioning
              </h2>
              <span className="text-xs text-slate-500">
                {filtered.length} testpack{filtered.length !== 1 ? "s" : ""}
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
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Search testpacks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-56 text-sm bg-white border-slate-300"
              />
            </div>
          </div>

          {/* KPI strip */}
          <div className="px-5 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-4 flex-shrink-0">
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-sky-600">
                {kpis.readyForTestingCount}
              </span>{" "}
              Ready for testing
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-amber-600">
                {kpis.testingInProgressCount}
              </span>{" "}
              In test
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-emerald-600">
                {kpis.testedCount}
              </span>{" "}
              Tested
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-700">
              <span className="font-semibold text-violet-600">
                {kpis.preCommedCount}
              </span>{" "}
              Pre-commissioned
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
                      Testpack
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
                  <th
                    className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer select-none"
                    onClick={() => handleSort("blindedDate")}
                  >
                    <span className="flex items-center">
                      Blinded on
                      <SortIcon
                        active={sortCol === "blindedDate"}
                        dir={sortDir}
                      />
                    </span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Test start
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Test done
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    Pre-comm
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      No testpacks ready for testing.
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
                    <td className="px-3 py-2 text-slate-700">
                      {formatDate(row.blindingDate)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatDate(row.testingStartDate)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatDate(row.testingDoneDate)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatDate(row.preCommDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side panel */}
        {selectedTestPack && (
          <aside className="w-[380px] flex-shrink-0 rounded-xl border border-slate-200 bg-white flex flex-col h-full overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-900">
                  Record Dates
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
                  <span className="text-slate-500">Blinded on</span>
                  <span className="text-slate-700">
                    {formatDate(selectedTestPack.blindingDate)}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200" />

              {/* Date inputs */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">
                    Testing start date
                  </Label>
                  <Input
                    type="date"
                    value={testingStartDate}
                    onChange={(e) => setTestingStartDate(e.target.value)}
                    className="h-9 text-sm bg-white border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    className={cn(
                      "text-sm font-medium",
                      !testingStartDate ? "text-slate-400" : "text-slate-700",
                    )}
                  >
                    Testing done date
                  </Label>
                  <Input
                    type="date"
                    value={testingDoneDate}
                    onChange={(e) => setTestingDoneDate(e.target.value)}
                    disabled={!testingStartDate}
                    className="h-9 text-sm bg-white border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    className={cn(
                      "text-sm font-medium",
                      !testingDoneDate ? "text-slate-400" : "text-slate-700",
                    )}
                  >
                    Pre-commissioning date
                  </Label>
                  <Input
                    type="date"
                    value={preCommDate}
                    onChange={(e) => setPreCommDate(e.target.value)}
                    disabled={!testingDoneDate}
                    className="h-9 text-sm bg-white border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-5 py-3 border-t border-slate-200 flex-shrink-0 bg-slate-50">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isSaving}
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
                    Save dates
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
