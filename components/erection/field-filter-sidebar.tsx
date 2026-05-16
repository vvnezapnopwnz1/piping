"use client";

import type { ChangeEvent } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ERECTION_STATUS_OPTIONS } from "@/lib/erection-weld-data";

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

interface FieldFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onApply: () => void;
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "On Hold"];

const AREA_ZONE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Area A", label: "Area A" },
  { value: "Area B", label: "Area B" },
  { value: "Area C", label: "Area C" },
  { value: "Area D", label: "Area D" },
];

export function FieldFilterBar({
  filters,
  onFilterChange,
  onApply,
}: FieldFilterBarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2 shrink-0 max-w-full">
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 shrink-0" />
        <span className="text-xs font-semibold text-slate-900 tracking-wide uppercase">
          Field Erection
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1 w-[108px] shrink-0">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            PDS Area
          </Label>
          <Select
            value={filters.pdsArea}
            onValueChange={(value: string) =>
              onFilterChange({ ...filters, pdsArea: value })
            }
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8 focus:ring-sky-500">
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              <SelectItem
                value="all"
                className="text-slate-900 focus:bg-slate-100"
              >
                All Areas
              </SelectItem>
              <SelectItem
                value="TK-100"
                className="text-slate-900 focus:bg-slate-100"
              >
                TK-100
              </SelectItem>
              <SelectItem
                value="CW-200"
                className="text-slate-900 focus:bg-slate-100"
              >
                CW-200
              </SelectItem>
              <SelectItem
                value="FU-300"
                className="text-slate-900 focus:bg-slate-100"
              >
                FU-300
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 w-[108px] shrink-0 mr-2">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Subcontractor
          </Label>
          <Select
            value={filters.subcontractor}
            onValueChange={(value: string) =>
              onFilterChange({ ...filters, subcontractor: value })
            }
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              <SelectItem
                value="all"
                className="text-slate-900 focus:bg-slate-100"
              >
                All
              </SelectItem>
              <SelectItem
                value="Petrofab LLC"
                className="text-slate-900 focus:bg-slate-100"
              >
                Petrofab LLC
              </SelectItem>
              <SelectItem
                value="TechWeld Co"
                className="text-slate-900 focus:bg-slate-100"
              >
                TechWeld Co
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 w-[108px] shrink-0 ml-2">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Material Type
          </Label>
          <Select
            value={filters.materialType}
            onValueChange={(value: string) =>
              onFilterChange({ ...filters, materialType: value })
            }
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              <SelectItem
                value="all"
                className="text-slate-900 focus:bg-slate-100"
              >
                All
              </SelectItem>
              <SelectItem
                value="Carbon Steel"
                className="text-slate-900 focus:bg-slate-100"
              >
                Carbon Steel
              </SelectItem>
              <SelectItem
                value="Stainless 316L"
                className="text-slate-900 focus:bg-slate-100"
              >
                Stainless 316L
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 w-[126px] shrink-0">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Service Class
          </Label>
          <Select
            value={filters.serviceClass}
            onValueChange={(value: string) =>
              onFilterChange({ ...filters, serviceClass: value })
            }
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              <SelectItem
                value="all"
                className="text-slate-900 focus:bg-slate-100"
              >
                All
              </SelectItem>
              <SelectItem
                value="CL150"
                className="text-slate-900 focus:bg-slate-100"
              >
                CL150
              </SelectItem>
              <SelectItem
                value="CL300"
                className="text-slate-900 focus:bg-slate-100"
              >
                CL300
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 w-[96px] shrink-0">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Area Zone
          </Label>
          <Select
            value={filters.areaZone}
            onValueChange={(value: string) =>
              onFilterChange({ ...filters, areaZone: value })
            }
          >
            <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-sm h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-300">
              {AREA_ZONE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-slate-900 focus:bg-slate-100"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 w-[120px] shrink-0">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Weld Status
          </Label>
          <MultiSelectFilter
            value={filters.statuses}
            options={STATUS_OPTIONS}
            onChange={(statuses) => onFilterChange({ ...filters, statuses })}
            placeholder="All"
          />
        </div>

        <div className="flex flex-col gap-1 w-[130px] shrink-0">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Erection Status
          </Label>
          <MultiSelectFilter
            value={filters.erectionStatuses}
            options={ERECTION_STATUS_OPTIONS}
            onChange={(erectionStatuses) =>
              onFilterChange({ ...filters, erectionStatuses })
            }
            placeholder="All"
          />
        </div>

        <div className="flex flex-col gap-1 w-[200px] shrink-0">
          <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            Date Range
          </Label>
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onFilterChange({ ...filters, dateFrom: event.target.value })
              }
              className="bg-white border-slate-300 text-slate-900 text-sm h-8 [color-scheme:light] flex-1 min-w-0"
            />
            <span className="text-xs text-slate-500">-</span>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onFilterChange({ ...filters, dateTo: event.target.value })
              }
              className="bg-white border-slate-300 text-slate-900 text-sm h-8 [color-scheme:light] flex-1 min-w-0"
            />
          </div>
        </div>

        <Button
          onClick={onApply}
          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium h-8 px-4 shrink-0"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
