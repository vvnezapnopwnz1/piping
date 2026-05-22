"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { FieldFilterBar } from "@/components/erection/field-filter-sidebar";
import { FieldWeldDetailPanel } from "@/components/erection/field-weld-detail-panel";
import { FieldWeldTable } from "@/components/erection/field-weld-table";
import { useErectionStore } from "@/store";
import { cn } from "@/lib/utils";
import {
  ERECTION_STATUS_OPTIONS,
  type ErectionStatus,
} from "@/lib/erection-weld-data";

interface FilterState {
  pdsArea: string;
  subcontractor: string;
  materialType: string;
  serviceClass: string;
  statuses: string[];
  erectionStatuses: string[];
  areaZone: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: FilterState = {
  pdsArea: "all",
  subcontractor: "all",
  materialType: "all",
  serviceClass: "all",
  statuses: [],
  erectionStatuses: [],
  areaZone: "all",
  dateFrom: "",
  dateTo: "",
};

function parseDisplayDate(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isErectionStatus(value: string): value is ErectionStatus {
  return (ERECTION_STATUS_OPTIONS as readonly string[]).includes(value);
}

function ErectionWeldProgressInner() {
  const fieldWelds = useErectionStore((s) => s.fieldWelds);
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status && isErectionStatus(status)) {
      const next = {
        ...DEFAULT_FILTERS,
        erectionStatuses: [status],
      };
      setFilters(next);
      setAppliedFilters(next);
    }
  }, [searchParams]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const setErectionQuickFilter = (status: string | null) => {
    const next = {
      ...filters,
      erectionStatuses: status ? [status] : [],
    };
    setFilters(next);
    setAppliedFilters(next);
    const params = new URLSearchParams(window.location.search);
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      `/erection/weld-progress${qs ? `?${qs}` : ""}`,
    );
  };

  const urlStatus = searchParams.get("status");
  const activeUrlStatus =
    urlStatus && isErectionStatus(urlStatus) ? urlStatus : null;

  const filteredJoints = fieldWelds.filter((joint) => {
    if (
      appliedFilters.pdsArea !== "all" &&
      !joint.spoolNo.includes(appliedFilters.pdsArea.replace("-", ""))
    ) {
      return false;
    }

    if (
      appliedFilters.materialType !== "all" &&
      joint.materialType !== appliedFilters.materialType
    ) {
      return false;
    }

    const weldDate = parseDisplayDate(joint.weldDate);

    if (
      appliedFilters.dateFrom &&
      weldDate &&
      weldDate < new Date(appliedFilters.dateFrom)
    ) {
      return false;
    }

    if (
      appliedFilters.dateTo &&
      weldDate &&
      weldDate > new Date(appliedFilters.dateTo)
    ) {
      return false;
    }

    if (
      appliedFilters.statuses.length > 0 &&
      !appliedFilters.statuses.includes(joint.status)
    ) {
      return false;
    }

    if (
      appliedFilters.erectionStatuses.length > 0 &&
      !appliedFilters.erectionStatuses.includes(joint.erectionStatus)
    ) {
      return false;
    }

    if (
      appliedFilters.areaZone !== "all" &&
      !joint.areaZone.startsWith(appliedFilters.areaZone)
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[720px] gap-1 overflow-hidden max-w-full">
      {activeUrlStatus && (
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
          <span className="text-xs text-slate-600">
            Filtered by erection status:
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-white px-2 py-0.5 text-xs font-medium text-sky-800">
            {activeUrlStatus}
            <button
              type="button"
              aria-label="Clear erection status filter"
              className="rounded-full p-0.5 hover:bg-sky-100"
              onClick={() => setErectionQuickFilter(null)}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
          <span className="text-xs text-slate-500">
            {filteredJoints.length} joint
            {filteredJoints.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Erection quick status
          </span>
          <button
            onClick={() => setErectionQuickFilter(null)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              appliedFilters.erectionStatuses.length === 0
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            All
          </button>
          {ERECTION_STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setErectionQuickFilter(status)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                appliedFilters.erectionStatuses.length === 1 &&
                  appliedFilters.erectionStatuses[0] === status
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <FieldFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onApply={handleApplyFilters}
      />

      <div className="grid flex-1 min-h-0 overflow-hidden gap-1 grid-cols-[minmax(0,1fr)_360px]">
        <main className="flex min-w-0 overflow-hidden">
          <FieldWeldTable
            data={filteredJoints}
            onSelectJoint={(joint) => setSelectedId(joint.id)}
            selectedJointId={selectedId ?? undefined}
          />
        </main>

        <FieldWeldDetailPanel
          selectedId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}

export default function ErectionWeldProgressPage() {
  return (
    <Suspense fallback={null}>
      <ErectionWeldProgressInner />
    </Suspense>
  );
}
