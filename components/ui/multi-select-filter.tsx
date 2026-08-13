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
            // This used to pin itself to white on slate-300, which meant the one filter control in
            // the app was the one control that stayed light when the app went dark.
            "h-8 w-full justify-between gap-1 px-2.5 text-sm font-normal shadow-none",
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
              className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5"
            >
              <Checkbox
                checked={value.includes(option)}
                onCheckedChange={() => toggle(option)}
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
