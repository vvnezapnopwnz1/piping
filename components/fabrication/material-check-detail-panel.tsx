"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useSpoolsStore, useNotificationsStore, useSpoolStages } from "@/store";
import {
  QC_INSPECTORS,
  STAGE_COLOR,
  type HeatPiece,
  type MaterialCheckRecord,
  type MaterialCheckStatus,
} from "@/lib/spool-data";
import { cn } from "@/lib/utils";
import { useHeatNumberValidator } from "@/lib/heat-validator";
import { usePmWriteLock } from "@/lib/pm-write-lock";
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface MaterialCheckDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: MaterialCheckStatus[] = [
  "Pending",
  "Cleared",
  "Non-conformance",
];

function StatusSegmented({
  value,
  onChange,
}: {
  value: MaterialCheckStatus;
  onChange: (v: MaterialCheckStatus) => void;
}) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      {STATUS_OPTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            "px-2 py-1 text-[10px] font-medium transition-colors",
            value === s
              ? "bg-sky-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {s === "Non-conformance" ? "NC" : s}
        </button>
      ))}
    </div>
  );
}

export function MaterialCheckDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: MaterialCheckDetailPanelProps) {
  const router = useRouter();
  const storeRecord = useSpoolsStore((s) =>
    spoolNo ? s.getRecord(spoolNo) : undefined,
  );
  const stages = useSpoolStages();
  const stage = spoolNo
    ? (stages.get(spoolNo) ?? "Not Started")
    : "Not Started";

  const [form, setForm] = useState<MaterialCheckRecord | null>(null);
  const [inspector, setInspector] = useState<string>(QC_INSPECTORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const { validate: validateHeat, activeHeats } = useHeatNumberValidator();
  const { locked: pmLocked } = usePmWriteLock();

  useEffect(() => {
    if (storeRecord) {
      setForm(JSON.parse(JSON.stringify(storeRecord)));
      setInspector(storeRecord.inspector ?? QC_INSPECTORS[0]);
    } else {
      setForm(null);
    }
  }, [storeRecord]);

  const colors = STAGE_COLOR[stage];

  const heatValidations = useMemo(() => {
    if (!form) return new Map<string, ReturnType<typeof validateHeat>>();
    const m = new Map<string, ReturnType<typeof validateHeat>>();
    for (const p of form.pieces) {
      if (p.heatNumber.trim()) {
        m.set(p.id, validateHeat(p.heatNumber));
      }
    }
    return m;
  }, [form, validateHeat]);

  const blockedCount = useMemo(
    () =>
      Array.from(heatValidations.values()).filter((v) => !v.valid).length,
    [heatValidations],
  );

  const validation = useMemo(() => {
    if (!form) return { ok: false, message: "" };
    const clearedCount = form.pieces.filter(
      (p) => p.status === "Cleared",
    ).length;
    const ncMissingRemark = form.pieces.some(
      (p) => p.status === "Non-conformance" && !p.ncRemark?.trim(),
    );
    if (blockedCount > 0) {
      return {
        ok: false,
        message: `${blockedCount} heat number${blockedCount === 1 ? "" : "s"} not in Project Piping Material List. Fix before sign-off.`,
      };
    }
    if (clearedCount === 0) {
      return {
        ok: false,
        message: "Clear at least one piece before sign-off.",
      };
    }
    if (ncMissingRemark) {
      return {
        ok: false,
        message: "Add a remark for every non-conformance row before sign-off.",
      };
    }
    return { ok: true, message: "" };
  }, [form, blockedCount]);

  if (!spoolNo || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[640px]">
          <p className="text-sm text-slate-500 mt-8">
            Select a spool to view details
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const totalPieces = form.pieces.length;
  const ncCount = form.pieces.filter(
    (p) => p.status === "Non-conformance",
  ).length;
  const pendingCount = form.pieces.filter((p) => p.status === "Pending").length;

  const updatePiece = (id: string, patch: Partial<HeatPiece>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const pieces = prev.pieces.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      );
      const nc = pieces.filter((p) => p.status === "Non-conformance").length;
      return { ...prev, pieces, nonConformanceCount: nc };
    });
  };

  const handleSaveDraft = async () => {
    if (!form) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    const updatePieceAction = useSpoolsStore.getState().updatePiece;
    for (const piece of form.pieces) {
      updatePieceAction(form.spoolNo, piece.id, {
        heatNumber: piece.heatNumber,
        millCertRef: piece.millCertRef,
        status: piece.status,
        ncRemark: piece.ncRemark,
      });
    }
    setIsSaving(false);
    toast.success("Draft saved");
  };

  const handleSignOff = async () => {
    if (!form || !validation.ok) return;
    setIsSigning(true);
    await new Promise((r) => setTimeout(r, 700));

    const updatePieceAction = useSpoolsStore.getState().updatePiece;
    for (const piece of form.pieces) {
      updatePieceAction(form.spoolNo, piece.id, {
        heatNumber: piece.heatNumber,
        millCertRef: piece.millCertRef,
        status: piece.status,
        ncRemark: piece.ncRemark,
      });
    }

    useSpoolsStore.getState().signOffMaterialCheck(form.spoolNo, inspector);

    setIsSigning(false);
    onOpenChange(false);

    toast.success(
      `Material Check signed off for ${form.spoolNo} (${ncCount} NCs)`,
    );

    const pushNotification = useNotificationsStore.getState().pushNotification;
    pushNotification({
      severity: ncCount > 0 ? "warning" : "info",
      category: "weld_progress",
      title: `${form.spoolNo}: Material Check complete`,
      description: `${ncCount} non-conformance${ncCount === 1 ? "" : "s"} · advanced to Weld Progress`,
      href: "/fabrication/material-check",
    });

    router.replace("/fabrication/material-check?status=Pending");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px] flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0 pb-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-mono text-base">{spoolNo}</SheetTitle>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                colors.bg,
                colors.text,
                "border-current/20",
              )}
            >
              {stage}
            </span>
          </div>
          <SheetDescription>
            {totalPieces} piece{totalPieces === 1 ? "" : "s"}
            {ncCount > 0 ? ` · ${ncCount} NC` : ""}
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
          </SheetDescription>
        </SheetHeader>
        <PmWriteLockBanner />

        <div className="flex-1 min-h-0 overflow-auto py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Heat #</TableHead>
                <TableHead className="text-xs">Grade</TableHead>
                <TableHead className="text-xs">Dia × Length</TableHead>
                <TableHead className="text-xs">Mill cert</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs min-w-[160px]">
                  NC remark
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.pieces.map((piece) => (
                <TableRow key={piece.id}>
                  <TableCell>
                    <Input
                      className={cn(
                        "h-8 text-xs font-mono",
                        heatValidations.get(piece.id)?.valid === false &&
                          piece.heatNumber.trim()
                          ? "border-red-400 bg-red-50"
                          : "",
                      )}
                      value={piece.heatNumber}
                      disabled={piece.status !== "Pending" || pmLocked}
                      list={`pml-${piece.id}`}
                      onChange={(e) =>
                        updatePiece(piece.id, { heatNumber: e.target.value })
                      }
                    />
                    <datalist id={`pml-${piece.id}`}>
                      {activeHeats.slice(0, 50).map((h) => (
                        <option key={h} value={h} />
                      ))}
                    </datalist>
                    {piece.heatNumber.trim() &&
                      heatValidations.get(piece.id)?.valid === false && (
                        <p className="mt-1 text-[10px] text-red-700 leading-tight">
                          {heatValidations.get(piece.id)?.message}
                        </p>
                      )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                      {piece.materialGrade}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                    {piece.diaInch} × {piece.lengthM} m
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-xs font-mono"
                      placeholder="MILL-2026-XXXX"
                      value={piece.millCertRef ?? ""}
                      onChange={(e) =>
                        updatePiece(piece.id, { millCertRef: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <StatusSegmented
                      value={piece.status}
                      onChange={(v) => updatePiece(piece.id, { status: v })}
                    />
                  </TableCell>
                  <TableCell>
                    {piece.status === "Non-conformance" ? (
                      <Textarea
                        className="text-xs min-h-[48px] py-1"
                        placeholder="Describe NC…"
                        value={piece.ncRemark ?? ""}
                        onChange={(e) =>
                          updatePiece(piece.id, { ncRemark: e.target.value })
                        }
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <SheetFooter className="shrink-0 flex-col items-stretch gap-3 border-t pt-4">
          {!validation.ok && (
            <p className="text-xs text-red-600">{validation.message}</p>
          )}

          <div className="flex items-center gap-3">
            <Label className="text-xs text-slate-600 whitespace-nowrap">
              Inspector
            </Label>
            <Select value={inspector} onValueChange={setInspector}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QC_INSPECTORS.map((i) => (
                  <SelectItem key={i} value={i} className="text-xs">
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || isSigning || pmLocked}
            >
              {isSaving ? "Saving…" : "Save draft"}
            </Button>
            <Button
              size="sm"
              onClick={handleSignOff}
              disabled={!validation.ok || isSaving || isSigning || pmLocked}
            >
              {isSigning ? "Signing off…" : "Sign off"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
