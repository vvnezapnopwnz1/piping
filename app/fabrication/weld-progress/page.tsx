"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { FilterBar } from "@/components/filter-sidebar";
import { WeldDetailPanel } from "@/components/weld-detail-panel";
import { WeldTable } from "@/components/weld-table";
import { Factory, X } from "lucide-react";
import { type WeldJoint } from "@/lib/weld-data";
import { useWeldsStore } from "@/store";

interface FilterState {
  pdsArea: string;
  subcontractor: string;
  materialType: string;
  serviceClass: string;
  statuses: string[];
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: FilterState = {
  pdsArea: "all",
  subcontractor: "all",
  materialType: "all",
  serviceClass: "all",
  statuses: [],
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

function WeldProgressInner() {
  const welds = useWeldsStore((s) => s.welds);
  const updateWeld = useWeldsStore((s) => s.updateWeld);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(DEFAULT_FILTERS);
  const [selectedJoint, setSelectedJoint] = useState<WeldJoint | null>(null);
  const searchParams = useSearchParams();
  const [spoolFilter, setSpoolFilter] = useState<string | null>(null);

  useEffect(() => {
    const spool = searchParams.get("spool");
    if (spool) {
      setSpoolFilter(spool);
    }
  }, [searchParams]);

  const clearSpoolFilter = () => {
    setSpoolFilter(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("spool");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      `/fabrication/weld-progress${qs ? `?${qs}` : ""}`,
    );
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const filteredJoints = welds.filter((joint) => {
    // G6: shop-only invariant — exclude field joints by naming convention.
    // useWeldsStore currently only seeds shop joints, but this guard is
    // defensive and will also work once a formal `source` discriminator
    // is added in G7.
    if (joint.jointNo.startsWith("FJ-")) {
      return false;
    }

    if (spoolFilter && joint.spoolNo !== spoolFilter) {
      return false;
    }

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

    return true;
  });

  const handleSave = (updated: WeldJoint) => {
    updateWeld(updated.id, updated);
    setSelectedJoint(updated);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[720px] gap-1 overflow-hidden max-w-full">
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onApply={handleApplyFilters}
      />

      <div className="grid flex-1 min-h-0 overflow-hidden gap-1 grid-cols-[minmax(0,1fr)_360px]">
        <main className="flex min-w-0 overflow-hidden flex-col">
          <div className="px-4 py-2 shrink-0 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-sm border border-emerald-200">
              <Factory className="h-3.5 w-3.5" />
              Shop joints only
            </span>
            {spoolFilter && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-sm border border-sky-200">
                Spool: {spoolFilter}
                <button
                  onClick={clearSpoolFilter}
                  className="hover:text-sky-950"
                  aria-label="Clear spool filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
          <WeldTable
            data={filteredJoints}
            onSelectJoint={setSelectedJoint}
            selectedJointId={selectedJoint?.id}
          />
        </main>

        <WeldDetailPanel
          joint={selectedJoint}
          onClose={() => setSelectedJoint(null)}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

export default function WeldProgressPage() {
  return (
    <Suspense fallback={null}>
      <WeldProgressInner />
    </Suspense>
  );
}
