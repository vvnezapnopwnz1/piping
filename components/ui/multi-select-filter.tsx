"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  value: string[];
  options: readonly string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function MultiSelectFilter({
  value,
  options,
  onChange,
  placeholder = "All",
  className,
  id,
}: MultiSelectFilterProps) {
  const toggle = (option: string) => {
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  };

  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? value[0]
        : `${value.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-8 w-full justify-between gap-1 bg-white border-slate-300 text-slate-900 text-sm font-normal shadow-none hover:bg-white px-2.5",
            className,
          )}
        >
          <span className="truncate text-left">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1.5"
      >
        <div className="flex flex-col gap-0.5">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100"
            >
              <Checkbox
                checked={value.includes(option)}
                onCheckedChange={() => toggle(option)}
                className="border-slate-300 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
              />
              <span className="text-sm text-slate-700">{option}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
