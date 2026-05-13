"use client"

import { useState } from "react"
import { FilterSidebar } from "@/components/filter-sidebar"
import { WeldTable } from "@/components/weld-table"
import { WeldDetailPanel } from "@/components/weld-detail-panel"
import { WELD_DATA, type WeldJoint } from "@/lib/weld-data"
import { Bell, Settings, User, HelpCircle, ChevronRight } from "lucide-react"

interface FilterState {
  pdsArea: string
  subcontractor: string
  materialType: string
  serviceClass: string
  statuses: string[]
  dateFrom: string
  dateTo: string
}

const DEFAULT_FILTERS: FilterState = {
  pdsArea: "all",
  subcontractor: "all",
  materialType: "all",
  serviceClass: "all",
  statuses: [],
  dateFrom: "",
  dateTo: "",
}

export default function WeldProgressPage() {
  const [joints, setJoints] = useState<WeldJoint[]>(WELD_DATA)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedJoint, setSelectedJoint] = useState<WeldJoint | null>(null)

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters })
  }

  const filteredJoints = joints.filter((j) => {
    if (appliedFilters.pdsArea !== "all" && !j.spoolNo.includes(appliedFilters.pdsArea.replace("-", ""))) {
      // rough area filter by spool prefix
    }
    if (appliedFilters.statuses.length > 0 && !appliedFilters.statuses.includes(j.status)) {
      return false
    }
    return true
  })

  const handleSave = (updated: WeldJoint) => {
    setJoints((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
    setSelectedJoint(updated)
  }

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900 overflow-hidden">
      {/* Top Nav */}
      <header className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-4 flex-shrink-0 z-20">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">PipeQC</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-600 font-medium">Construction Management</span>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-600 ml-2">
          <span className="hover:text-slate-900 cursor-pointer">Projects</span>
          <ChevronRight className="w-3 h-3" />
          <span className="hover:text-slate-900 cursor-pointer">PROJ-LNG-2025</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 font-medium">Weld Progress</span>
        </nav>

        <div className="flex-1" />

        {/* Right nav icons */}
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <div className="ml-2 flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-medium text-slate-700 leading-none">A. Rahman</span>
              <span className="text-[10px] text-slate-600 leading-none mt-0.5">QC Engineer</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main 3-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <FilterSidebar
          filters={filters}
          onFilterChange={setFilters}
          onApply={handleApplyFilters}
        />

        {/* Center Table */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          <WeldTable
            data={filteredJoints}
            onSelectJoint={setSelectedJoint}
            selectedJointId={selectedJoint?.id}
          />
        </main>

        {/* Right Detail Panel */}
        <WeldDetailPanel
          joint={selectedJoint}
          onClose={() => setSelectedJoint(null)}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}
