"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAdminStore, type SysRefSlice } from "@/store/admin-store";
import { cn } from "@/lib/utils";

interface SystemReferentialCardProps {
  slice: SysRefSlice;
  title: string;
  description: string;
  codePlaceholder?: string;
  descriptionPlaceholder?: string;
}

export function SystemReferentialCard({
  slice,
  title,
  description,
  codePlaceholder = "e.g. REF-001",
  descriptionPlaceholder = "Short description",
}: SystemReferentialCardProps) {
  const entries = useAdminStore((s) => s.systemReferentials[slice]);
  const addSysRefEntry = useAdminStore((s) => s.addSysRefEntry);
  const toggleSysRefEntryActive = useAdminStore(
    (s) => s.toggleSysRefEntryActive,
  );

  const [code, setCode] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const existingCodes = useMemo(
    () => new Set(entries.map((e) => e.code)),
    [entries],
  );

  const reset = () => {
    setCode("");
    setDescriptionValue("");
  };

  const handleAdd = async () => {
    const trimmedCode = code.trim();
    const trimmedDescription = descriptionValue.trim();
    if (!trimmedCode) {
      toast.error("Code is required");
      return;
    }
    if (existingCodes.has(trimmedCode)) {
      toast.error(`Code ${trimmedCode} already exists`);
      return;
    }
    if (!trimmedDescription) {
      toast.error("Description is required");
      return;
    }
    setIsAdding(true);
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 200));
    addSysRefEntry(slice, {
      code: trimmedCode,
      description: trimmedDescription,
    });
    setIsAdding(false);
    toast.success(`${trimmedCode} added`);
    reset();
  };

  const activeCount = entries.filter((e) => e.active).length;

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {activeCount} / {entries.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Code
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                  <th className="w-10 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-xs text-slate-500"
                    >
                      No entries yet. Add the first row below.
                    </td>
                  </tr>
                )}
                {entries.map((entry, i) => (
                  <tr
                    key={entry.code}
                    className={cn(
                      "border-b border-slate-100",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-slate-700">
                      {entry.code}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-slate-700">
                      {entry.description}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      {entry.active ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-slate-300 bg-slate-100 text-[10px] text-slate-600"
                        >
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              toggleSysRefEntryActive(slice, entry.code)
                            }
                          >
                            {entry.active ? "Deactivate" : "Reactivate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={codePlaceholder}
            className="h-8 text-xs sm:w-32"
          />
          <Input
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            placeholder={descriptionPlaceholder}
            className="h-8 flex-1 text-xs"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isAdding || !code.trim() || !descriptionValue.trim()}
            className="gap-1"
          >
            {isAdding ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Adding…
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add row
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
