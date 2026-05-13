"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { SlidersHorizontal } from "lucide-react"

interface FilterState {
  pdsArea: string
  subcontractor: string
  materialType: string
  serviceClass: string
  statuses: string[]
  dateFrom: string
  dateTo: string
}

interface FilterSidebarProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  onApply: () => void
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "On Hold"]

export function FilterSidebar({ filters, onFilterChange, onApply }: FilterSidebarProps) {
  const handleStatusToggle = (status: string) => {
    const updated = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onFilterChange({ ...filters, statuses: updated })
  }

  return (
    <aside className="w-[260px] flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col h-full overflow-y-auto">
      {/* Sidebar Header */}
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-sky-600" />
          <span className="text-sm font-semibold text-slate-900 tracking-wide uppercase">
            Spool Fabrication
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-5">
        {/* PDS Area */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            PDS Area
          </Label>
          <Select
            value={filters.pdsArea}
            onValueChange={(val) => onFilterChange({ ...filters, pdsArea: val })}
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8 focus:ring-sky-500">
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              <SelectItem value="all" className="text-slate-900 focus:bg-slate-100">All Areas</SelectItem>
              <SelectItem value="TK-100" className="text-slate-900 focus:bg-slate-100">TK-100</SelectItem>
              <SelectItem value="CW-200" className="text-slate-900 focus:bg-slate-100">CW-200</SelectItem>
              <SelectItem value="FU-300" className="text-slate-900 focus:bg-slate-100">FU-300</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subcontractor */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Subcontractor
          </Label>
          <Select
            value={filters.subcontractor}
            onValueChange={(val) => onFilterChange({ ...filters, subcontractor: val })}
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              <SelectItem value="all" className="text-slate-900 focus:bg-slate-100">All</SelectItem>
              <SelectItem value="Petrofab LLC" className="text-slate-900 focus:bg-slate-100">Petrofab LLC</SelectItem>
              <SelectItem value="TechWeld Co" className="text-slate-900 focus:bg-slate-100">TechWeld Co</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Material Type */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Material Type
          </Label>
          <Select
            value={filters.materialType}
            onValueChange={(val) => onFilterChange({ ...filters, materialType: val })}
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              <SelectItem value="all" className="text-slate-900 focus:bg-slate-100">All</SelectItem>
              <SelectItem value="Carbon Steel" className="text-slate-900 focus:bg-slate-100">Carbon Steel</SelectItem>
              <SelectItem value="Stainless 316L" className="text-slate-900 focus:bg-slate-100">Stainless 316L</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Service Class */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Service Class
          </Label>
          <Select
            value={filters.serviceClass}
            onValueChange={(val) => onFilterChange({ ...filters, serviceClass: val })}
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              <SelectItem value="all" className="text-slate-900 focus:bg-slate-100">All</SelectItem>
              <SelectItem value="CL150" className="text-slate-900 focus:bg-slate-100">CL150</SelectItem>
              <SelectItem value="CL300" className="text-slate-900 focus:bg-slate-100">CL300</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Checkboxes */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Status
          </Label>
          <div className="flex flex-col gap-2.5">
            {STATUS_OPTIONS.map((status) => (
              <div key={status} className="flex items-center gap-2.5">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={() => handleStatusToggle(status)}
                  className="border-slate-300 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                />
                <label
                  htmlFor={`status-${status}`}
                  className="text-sm text-slate-700 cursor-pointer select-none"
                >
                  {status}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Date Range
          </Label>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">From</span>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                className="bg-white border-slate-300 text-slate-900 text-sm h-8 [color-scheme:light]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">To</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                className="bg-white border-slate-300 text-slate-900 text-sm h-8 [color-scheme:light]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <div className="px-5 py-4 border-t border-slate-200">
        <Button
          onClick={onApply}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium h-9"
        >
          Apply Filters
        </Button>
      </div>
    </aside>
  )
}
