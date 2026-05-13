"use client";

import { useState } from "react";

import { FilterSidebar } from "@/components/filter-sidebar";
import { WeldDetailPanel } from "@/components/weld-detail-panel";
import { WeldTable } from "@/components/weld-table";
import { WELD_DATA, type WeldJoint } from "@/lib/weld-data";

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

export default function WeldProgressPage() {
  const [joints, setJoints] = useState<WeldJoint[]>(WELD_DATA);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(DEFAULT_FILTERS);
  const [selectedJoint, setSelectedJoint] = useState<WeldJoint | null>(null);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const filteredJoints = joints.filter((joint) => {
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
    setJoints((previous) =>
      previous.map((joint) => (joint.id === updated.id ? updated : joint)),
    );
    setSelectedJoint(updated);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[720px] gap-4 overflow-hidden">
      <FilterSidebar
        filters={filters}
        onFilterChange={setFilters}
        onApply={handleApplyFilters}
      />

      <main className="flex min-w-0 flex-1 overflow-hidden">
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
  );
}
