"use client";

import { useState } from "react";

import { FieldFilterBar } from "@/components/erection/field-filter-sidebar";
import { FieldWeldDetailPanel } from "@/components/erection/field-weld-detail-panel";
import { FieldWeldTable } from "@/components/erection/field-weld-table";
import { useErectionStore } from "@/store";

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

export default function ErectionWeldProgressPage() {
  const fieldWelds = useErectionStore((s) => s.fieldWelds);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

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
