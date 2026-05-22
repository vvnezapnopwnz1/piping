"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { NdeMatrixRuleDialog } from "@/components/admin/nde-matrix-rule-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";

const SERVICE_CLASS_STYLES: Record<string, string> = {
  "Class 1": "bg-red-50 text-red-700 border-red-200",
  "Class 2": "bg-amber-50 text-amber-700 border-amber-200",
  "Class 3": "bg-sky-50 text-sky-700 border-sky-200",
  Utility: "bg-slate-100 text-slate-600 border-slate-300",
};

export function NdeMatrixTab() {
  const rules = useAdminStore((s) => s.ndeMatrix);
  const deleteNdeRule = useAdminStore((s) => s.deleteNdeRule);

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const distinct = new Set(rules.map((r) => r.serviceClass));
    return {
      rows: rules.length,
      classesCovered: distinct.size,
    };
  }, [rules]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rules;
    const q = search.toLowerCase();
    return rules.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.serviceClass.toLowerCase().includes(q) ||
        r.primaryMethod.toLowerCase().includes(q) ||
        (r.secondaryMethod?.toLowerCase().includes(q) ?? false) ||
        r.diameterRange.toLowerCase().includes(q) ||
        r.thicknessRange.toLowerCase().includes(q),
    );
  }, [rules, search]);

  const editingRule = useMemo(
    () => rules.find((r) => r.id === editingId) ?? undefined,
    [rules, editingId],
  );
  const deletingRule = useMemo(
    () => rules.find((r) => r.id === deletingId) ?? null,
    [rules, deletingId],
  );

  const handleConfirmDelete = () => {
    if (!deletingRule) return;
    deleteNdeRule(deletingRule.id);
    toast.success(`Rule ${deletingRule.id} deleted`);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        NDE method matrix — §3.9 (ASME B31.3 service class). Drives sampling
        decisions in QC release.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Kpi label="Rules" value={kpis.rows} />
        <Kpi label="Service classes covered" value={kpis.classesCovered} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search id, class, method…"
            className="h-8 w-72 pl-8 text-xs"
          />
        </div>
        <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <Th>ID</Th>
                <Th>Service Class</Th>
                <Th>Diameter</Th>
                <Th>Thickness</Th>
                <Th>Primary</Th>
                <Th>Coverage</Th>
                <Th>Secondary</Th>
                <Th>Coverage</Th>
                <Th>Acceptance</Th>
                <Th className="w-10">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No rules match the current search.
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-500">
                    {r.id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        SERVICE_CLASS_STYLES[r.serviceClass],
                      )}
                    >
                      {r.serviceClass}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">
                    {r.diameterRange}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">
                    {r.thicknessRange}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700 font-medium">
                    {r.primaryMethod}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                    {r.primaryCoverage}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-700">
                    {r.secondaryMethod ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                    {r.secondaryCoverage ?? (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                    {r.acceptanceCriterion}
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
                          onClick={() => setEditingId(r.id)}
                        >
                          Edit…
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingId(r.id)}
                          className="text-red-600 focus:text-red-700"
                        >
                          Delete…
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

      <NdeMatrixRuleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
      />

      <NdeMatrixRuleDialog
        open={editingId !== null}
        onOpenChange={(next) => {
          if (!next) setEditingId(null);
        }}
        mode="edit"
        initial={editingRule}
      />

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(next) => {
          if (!next) setDeletingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete NDE rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingRule ? (
                <>
                  Rule <span className="font-mono">{deletingRule.id}</span> (
                  {deletingRule.serviceClass} · {deletingRule.diameterRange} ·{" "}
                  {deletingRule.primaryMethod}) will be permanently removed.
                  This action cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
      <span className="text-slate-500">{label}:</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
