"use client";

import { useState } from "react";

import { FieldFilterSidebar } from "@/components/erection/field-filter-sidebar";
import { FieldWeldDetailPanel } from "@/components/erection/field-weld-detail-panel";
import { FieldWeldTable } from "@/components/erection/field-weld-table";
import { FIELD_WELD_DATA, type FieldWeldJoint } from "@/lib/erection-weld-data";

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
  const [welds, setWelds] = useState<FieldWeldJoint[]>(FIELD_WELD_DATA);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(DEFAULT_FILTERS);
  const [selectedJoint, setSelectedJoint] = useState<FieldWeldJoint | null>(
    null,
  );

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const filteredJoints = welds.filter((joint) => {
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

  const handleSave = (updated: FieldWeldJoint) => {
    setWelds((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    setSelectedJoint(updated);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[720px] gap-1 overflow-hidden">
      <FieldFilterSidebar
        filters={filters}
        onFilterChange={setFilters}
        onApply={handleApplyFilters}
      />

      <main className="flex min-w-0 flex-1 overflow-hidden">
        <FieldWeldTable
          data={filteredJoints}
          onSelectJoint={setSelectedJoint}
          selectedJointId={selectedJoint?.id}
        />
      </main>

      <FieldWeldDetailPanel
        joint={selectedJoint}
        onClose={() => setSelectedJoint(null)}
        onSave={handleSave}
      />
    </div>
  );
}
