"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";

import { AddWelderDialog } from "@/components/admin/add-welder-dialog";
import { EditWelderExpiryDialog } from "@/components/admin/edit-welder-expiry-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/store/admin-store";
import { cn, formatDate } from "@/lib/utils";

export function WelderQualificationsTab() {
  const welders = useAdminStore((s) => s.welderQualifications);
  const toggleWelderActive = useAdminStore((s) => s.toggleWelderActive);

  const [search, setSearch] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const currentQuarterStart = useMemo(() => {
    const q = Math.floor(today.getMonth() / 3);
    return new Date(today.getFullYear(), q * 3, 1);
  }, [today]);
  const currentQuarterEnd = useMemo(() => {
    const q = Math.floor(today.getMonth() / 3);
    return new Date(today.getFullYear(), q * 3 + 3, 0);
  }, [today]);

  const kpis = useMemo(() => {
    const active = welders.filter((w) => w.active);
    const wpsSet = new Set<string>();
    let expiring = 0;
    active.forEach((w) => {
      w.qualifiedWPS.forEach((wps) => wpsSet.add(wps));
      const exp = new Date(w.qualificationExpiresOn);
      if (exp >= currentQuarterStart && exp <= currentQuarterEnd) expiring++;
    });
    return {
      total: welders.length,
      active: active.length,
      distinctWps: wpsSet.size,
      expiring,
    };
  }, [welders, currentQuarterStart, currentQuarterEnd]);

  const filtered = useMemo(() => {
    if (!search.trim()) return welders;
    const q = search.toLowerCase();
    return welders.filter(
      (w) =>
        w.welderCode.toLowerCase().includes(q) ||
        w.fullName.toLowerCase().includes(q) ||
        w.qualifiedWPS.some((c) => c.toLowerCase().includes(q)) ||
        w.qualifiedMaterials.some((m) => m.toLowerCase().includes(q)),
    );
  }, [welders, search]);

  const editingWelder = useMemo(
    () => welders.find((w) => w.welderCode === editingCode) ?? null,
    [welders, editingCode],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Welder qualifications — §3.6 Project Referential. Source of truth for
        smart validation in Weld Progress + Field Welds.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Kpi label="Total" value={kpis.total} />
        <Kpi label="Active" value={kpis.active} valueClass="text-emerald-600" />
        <Kpi label="Qualified WPS codes" value={kpis.distinctWps} />
        <Kpi
          label="Expiring this quarter"
          value={kpis.expiring > 0 ? kpis.expiring : "—"}
          valueClass={kpis.expiring > 0 ? "text-amber-600" : undefined}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search welders, WPS, materials…"
            className="h-8 w-80 pl-8 text-xs"
          />
        </div>
        <AddWelderDialog />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <Th>Welder Code</Th>
                <Th>Name</Th>
                <Th>Qualified WPS</Th>
                <Th>Materials</Th>
                <Th>Expiry</Th>
                <Th>Status</Th>
                <Th className="w-10">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No welders match the current search.
                  </td>
                </tr>
              )}
              {filtered.map((w, i) => {
                const expiry = new Date(w.qualificationExpiresOn);
                const isExpired = expiry < today;
                const isExpiringSoon =
                  !isExpired &&
                  expiry.getTime() - today.getTime() <
                    30 * 24 * 60 * 60 * 1000;
                const visibleWps = w.qualifiedWPS.slice(0, 3);
                const remainingWps = w.qualifiedWPS.length - 3;
                return (
                  <tr
                    key={w.welderCode}
                    className={cn(
                      "border-b border-slate-100 transition-colors",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                      !w.active && "opacity-60",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-700">
                      {w.welderCode}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {w.fullName}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {visibleWps.map((wps) => (
                          <Badge
                            key={wps}
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                          >
                            {wps}
                          </Badge>
                        ))}
                        {remainingWps > 0 && (
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-[10px] text-slate-500"
                          >
                            +{remainingWps} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {w.qualifiedMaterials.join(", ")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      <span
                        className={cn(
                          isExpired
                            ? "text-red-600 font-medium"
                            : isExpiringSoon
                              ? "text-amber-600"
                              : "text-slate-500",
                        )}
                      >
                        {formatDate(w.qualificationExpiresOn)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {!w.active ? (
                        <Badge
                          variant="outline"
                          className="border-slate-300 bg-slate-100 text-xs text-slate-600"
                        >
                          Inactive
                        </Badge>
                      ) : isExpired ? (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-xs text-red-700"
                        >
                          Expired
                        </Badge>
                      ) : isExpiringSoon ? (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-xs text-amber-700"
                        >
                          Expiring soon
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700"
                        >
                          Valid
                        </Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingCode(w.welderCode)}
                          >
                            Renew expiry…
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleWelderActive(w.welderCode)}
                          >
                            {w.active ? "Deactivate" : "Reactivate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingWelder && (
        <EditWelderExpiryDialog
          open={editingCode !== null}
          onOpenChange={(next) => {
            if (!next) setEditingCode(null);
          }}
          welderCode={editingWelder.welderCode}
          welderName={editingWelder.fullName}
          initialExpiry={editingWelder.qualificationExpiresOn}
        />
      )}
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Kpi({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
      <span className="text-slate-500">{label}:</span>
      <span className={cn("font-semibold text-slate-900", valueClass)}>
        {value}
      </span>
    </div>
  );
}
