"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useToSiteStore,
  useFieldMaterialCheckStore,
  useErectionStore,
  useNotificationsStore,
  useSpoolErectionStages,
} from "@/store";
import {
  type FieldHeatPiece,
  type FieldMaterialCheckRecord,
  type FieldMaterialCheckStatus,
} from "@/lib/erection-stage";
import { QC_INSPECTORS } from "@/lib/spool-data";
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
import { Textarea } from "@/components/ui/textarea";

interface FieldMaterialCheckDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PIECE_TYPES: FieldHeatPiece["type"][] = [
  "Pipe Stub",
  "Fitting",
  "Flange",
  "Weld Stub",
];
const STATUS_OPTIONS: FieldMaterialCheckStatus[] = [
  "Pending",
  "Cleared",
  "Non-conformance",
];

function generateDefaultPieces(
  fieldJointId: string,
  heatNo?: string,
): FieldHeatPiece[] {
  return [
    {
      id: `FHP-${fieldJointId}-01`,
      fieldJointId,
      tag: "PIPE-STUB",
      type: "Pipe Stub",
      heatNumber: heatNo ?? "",
      status: "Pending",
    },
    {
      id: `FHP-${fieldJointId}-02`,
      fieldJointId,
      tag: "FITTING",
      type: "Fitting",
      heatNumber: "",
      status: "Pending",
    },
  ];
}

export function FieldMaterialCheckDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: FieldMaterialCheckDetailPanelProps) {
  const toSiteRecord = useToSiteStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const allStoreRecords = useFieldMaterialCheckStore((state) => state.records);
  const allFieldWelds = useErectionStore((state) => state.fieldWelds);
  const storeRecords = useMemo(
    () => (spoolNo ? allStoreRecords.filter((r) => r.spoolNo === spoolNo) : []),
    [spoolNo, allStoreRecords],
  );
  const fieldWelds = useMemo(
    () => (spoolNo ? allFieldWelds.filter((w) => w.spoolNo === spoolNo) : []),
    [spoolNo, allFieldWelds],
  );
  const stages = useSpoolErectionStages();

  const [jointForms, setJointForms] = useState<FieldMaterialCheckRecord[]>([]);
  const [inspector, setInspector] = useState<string>(QC_INSPECTORS[0]);
  const [wmcFormNo, setWmcFormNo] = useState("");
  const [remark, setRemark] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const { locked: pmLocked } = usePmWriteLock();
  const { validate: validateHeat, activeHeats } = useHeatNumberValidator();

  const heatValidations = useMemo(() => {
    const m = new Map<string, ReturnType<typeof validateHeat>>();
    for (const joint of jointForms) {
      for (const p of joint.pieces) {
        if (p.heatNumber.trim()) {
          m.set(`${joint.fieldJointId}-${p.id}`, validateHeat(p.heatNumber));
        }
      }
    }
    return m;
  }, [jointForms, validateHeat]);

  const blockedCount = useMemo(
    () =>
      Array.from(heatValidations.values()).filter((v) => !v.valid).length,
    [heatValidations],
  );

  useEffect(() => {
    if (!spoolNo) {
      setJointForms([]);
      setInspector(QC_INSPECTORS[0]);
      setWmcFormNo("");
      setRemark("");
      return;
    }

    const recordMap = new Map(storeRecords.map((r) => [r.fieldJointId, r]));
    const forms: FieldMaterialCheckRecord[] = fieldWelds.map((weld) => {
      const existing = recordMap.get(weld.id);
      if (existing) {
        return JSON.parse(JSON.stringify(existing));
      }
      return {
        fieldJointId: weld.id,
        spoolNo,
        pieces: generateDefaultPieces(weld.id, weld.heatNo ?? undefined),
        nonConformanceCount: 0,
      };
    });

    setJointForms(forms);

    if (storeRecords.length > 0 && storeRecords[0].inspector) {
      setInspector(storeRecords[0].inspector);
      setWmcFormNo(storeRecords[0].wmcFormNo ?? "");
      setRemark(storeRecords[0].remark ?? "");
    } else {
      setInspector(QC_INSPECTORS[0]);
      setWmcFormNo("");
      setRemark("");
    }
  }, [spoolNo, storeRecords, fieldWelds]);

  const stage = useMemo(() => {
    if (!spoolNo) return "Not Started";
    return (
      stages.find((item) => item.spoolNo === spoolNo)?.stage ?? "Not Started"
    );
  }, [spoolNo, stages]);

  const allSignedOff = useMemo(() => {
    return (
      storeRecords.length > 0 && storeRecords.every((r) => !!r.signedOffDate)
    );
  }, [storeRecords]);

  const allReady = useMemo(() => {
    if (jointForms.length === 0) return false;
    return jointForms.every((joint) => {
      const hasCleared = joint.pieces.some((p) => p.status === "Cleared");
      const ncMissingRemark = joint.pieces.some(
        (p) => p.status === "Non-conformance" && !p.ncRemark?.trim(),
      );
      return hasCleared && !ncMissingRemark;
    });
  }, [jointForms]);

  const validation = useMemo(() => {
    if (allSignedOff) return { ok: true, message: "" };
    if (jointForms.length === 0)
      return { ok: false, message: "No field joints found." };

    for (const joint of jointForms) {
      const clearedCount = joint.pieces.filter(
        (p) => p.status === "Cleared",
      ).length;
      if (clearedCount === 0) {
        return {
          ok: false,
          message: `Joint ${joint.fieldJointId}: clear at least one piece before sign-off.`,
        };
      }
      const ncMissingRemark = joint.pieces.some(
        (p) => p.status === "Non-conformance" && !p.ncRemark?.trim(),
      );
      if (ncMissingRemark) {
        return {
          ok: false,
          message: `Joint ${joint.fieldJointId}: add a remark for every NC row.`,
        };
      }
    }

    if (blockedCount > 0) {
      return {
        ok: false,
        message: `${blockedCount} heat number${blockedCount === 1 ? "" : "s"} not in Project Piping Material List. Fix before sign-off.`,
      };
    }
    if (!wmcFormNo.trim()) {
      return { ok: false, message: "Enter the W-MC QC form number." };
    }
    if (!inspector) {
      return { ok: false, message: "Select the inspector." };
    }
    return { ok: true, message: "" };
  }, [allSignedOff, jointForms, wmcFormNo, inspector, blockedCount]);

  if (!spoolNo || jointForms.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[640px]">
          <p className="mt-8 text-sm text-slate-500">
            Select a spool to view field material check details.
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const totalPieces = jointForms.reduce((sum, j) => sum + j.pieces.length, 0);
  const ncCount = jointForms.reduce(
    (sum, j) =>
      sum + j.pieces.filter((p) => p.status === "Non-conformance").length,
    0,
  );
  const pendingCount = jointForms.reduce(
    (sum, j) => sum + j.pieces.filter((p) => p.status === "Pending").length,
    0,
  );

  const updatePiece = (
    fieldJointId: string,
    pieceId: string,
    patch: Partial<FieldHeatPiece>,
  ) => {
    setJointForms((prev) =>
      prev.map((joint) => {
        if (joint.fieldJointId !== fieldJointId) return joint;
        const pieces = joint.pieces.map((p) =>
          p.id === pieceId ? { ...p, ...patch } : p,
        );
        const nc = pieces.filter((p) => p.status === "Non-conformance").length;
        return { ...joint, pieces, nonConformanceCount: nc };
      }),
    );
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    for (const joint of jointForms) {
      for (const piece of joint.pieces) {
        useFieldMaterialCheckStore
          .getState()
          .updatePiece(spoolNo, joint.fieldJointId, piece.id, {
            heatNumber: piece.heatNumber,
            millCertRef: piece.millCertRef,
            status: piece.status,
            ncRemark: piece.ncRemark,
          });
      }
    }

    setIsSaving(false);
    toast.success("Draft saved");
  };

  const handleSignOff = async () => {
    if (!validation.ok || !spoolNo) return;
    setIsSigning(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    for (const joint of jointForms) {
      for (const piece of joint.pieces) {
        useFieldMaterialCheckStore
          .getState()
          .updatePiece(spoolNo, joint.fieldJointId, piece.id, {
            heatNumber: piece.heatNumber,
            millCertRef: piece.millCertRef,
            status: piece.status,
            ncRemark: piece.ncRemark,
          });
      }
    }

    useFieldMaterialCheckStore.getState().signOffSpoolMC({
      spoolNo,
      inspector,
      wmcFormNo: wmcFormNo.trim(),
      remark: remark.trim() || undefined,
    });

    setIsSigning(false);
    onOpenChange(false);

    toast.success(
      `Field Material Check signed off for ${spoolNo} (${ncCount} NCs)`,
    );

    useNotificationsStore.getState().pushNotification({
      severity: ncCount > 0 ? "warning" : "success",
      category: "weld_progress",
      title: `${spoolNo}: Field Material Check complete`,
      description: `${ncCount} non-conformance${ncCount === 1 ? "" : "s"} · W-MC ${wmcFormNo.trim()}`,
      href: "/erection/material-check",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden sm:max-w-[640px]">
        <SheetHeader className="shrink-0 border-b pb-4">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-mono text-base">{spoolNo}</SheetTitle>
            <span
              className={cn(
                "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                stage === "Field Material Check"
                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                  : stage === "Erected"
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              {stage}
            </span>
          </div>
          <SheetDescription>
            {allSignedOff
              ? `Signed off on ${storeRecords[0]?.signedOffDate} by ${storeRecords[0]?.inspector}.`
              : allReady
                ? "All joints ready for sign-off."
                : `${totalPieces} piece${totalPieces === 1 ? "" : "s"}${ncCount > 0 ? ` · ${ncCount} NC` : ""}${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`}
          </SheetDescription>
        </SheetHeader>
        <PmWriteLockBanner />

        <div className="flex-1 space-y-5 overflow-auto py-4">
          {/* To Site bridge */}
          <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">To Site bridge</p>
            <p className="mt-1">
              Received: {toSiteRecord?.receivedDate ?? "—"} by{" "}
              {toSiteRecord?.receivedBy ?? "—"}
            </p>
            <p>W-24: {toSiteRecord?.w24FormNo ?? "—"}</p>
            {toSiteRecord?.remark && (
              <p className="mt-1 text-slate-600">
                Remark: {toSiteRecord.remark}
              </p>
            )}
          </div>

          {/* Joints */}
          {jointForms.map((joint) => {
            const weld = fieldWelds.find((w) => w.id === joint.fieldJointId);
            const isSigned = !!joint.signedOffDate;
            return (
              <div key={joint.fieldJointId} className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {joint.fieldJointId}
                  </p>
                  <span className="text-xs text-slate-500">
                    {weld?.fieldJointType} · {weld?.diaInch}
                  </span>
                  {isSigned && (
                    <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      Signed
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Tag
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Type
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Heat #
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Cert
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Status
                        </th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                          NC remark
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {joint.pieces.map((piece) => (
                        <tr
                          key={piece.id}
                          className="border-b border-slate-100"
                        >
                          <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-700">
                            {piece.tag}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5">
                            {isSigned ? (
                              <span className="text-xs text-slate-600">
                                {piece.type}
                              </span>
                            ) : (
                              <Select
                                value={piece.type}
                                onValueChange={(value) =>
                                  updatePiece(joint.fieldJointId, piece.id, {
                                    type: value as FieldHeatPiece["type"],
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-[110px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PIECE_TYPES.map((t) => (
                                    <SelectItem
                                      key={t}
                                      value={t}
                                      className="text-xs"
                                    >
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5">
                            {isSigned ? (
                              <span className="font-mono text-xs text-slate-700">
                                {piece.heatNumber || "—"}
                              </span>
                            ) : (
                              <>
                                <Input
                                  className={cn(
                                    "h-7 w-[120px] text-xs font-mono",
                                    heatValidations.get(
                                      `${joint.fieldJointId}-${piece.id}`,
                                    )?.valid === false && piece.heatNumber.trim()
                                      ? "border-red-400 bg-red-50"
                                      : "",
                                  )}
                                  value={piece.heatNumber}
                                  list={`pml-field-${joint.fieldJointId}-${piece.id}`}
                                  onChange={(e) =>
                                    updatePiece(joint.fieldJointId, piece.id, {
                                      heatNumber: e.target.value,
                                    })
                                  }
                                />
                                <datalist
                                  id={`pml-field-${joint.fieldJointId}-${piece.id}`}
                                >
                                  {activeHeats.slice(0, 50).map((h) => (
                                    <option key={h} value={h} />
                                  ))}
                                </datalist>
                                {piece.heatNumber.trim() &&
                                  heatValidations.get(
                                    `${joint.fieldJointId}-${piece.id}`,
                                  )?.valid === false && (
                                    <p className="mt-0.5 text-[10px] text-red-700 leading-tight">
                                      {
                                        heatValidations.get(
                                          `${joint.fieldJointId}-${piece.id}`,
                                        )?.message
                                      }
                                    </p>
                                  )}
                              </>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5">
                            {isSigned ? (
                              <span className="font-mono text-xs text-slate-700">
                                {piece.millCertRef || "—"}
                              </span>
                            ) : (
                              <Input
                                className="h-7 w-[120px] text-xs font-mono"
                                placeholder="MILL-XXXX"
                                value={piece.millCertRef ?? ""}
                                onChange={(e) =>
                                  updatePiece(joint.fieldJointId, piece.id, {
                                    millCertRef: e.target.value,
                                  })
                                }
                              />
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5">
                            {isSigned ? (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium",
                                  piece.status === "Cleared"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : piece.status === "Non-conformance"
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : "border-slate-200 bg-slate-50 text-slate-500",
                                )}
                              >
                                {piece.status}
                              </span>
                            ) : (
                              <Select
                                value={piece.status}
                                onValueChange={(value) =>
                                  updatePiece(joint.fieldJointId, piece.id, {
                                    status: value as FieldMaterialCheckStatus,
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-[130px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem
                                      key={s}
                                      value={s}
                                      className="text-xs"
                                    >
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {isSigned ? (
                              piece.status === "Non-conformance" ? (
                                <span className="text-xs text-red-700">
                                  {piece.ncRemark}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  —
                                </span>
                              )
                            ) : piece.status === "Non-conformance" ? (
                              <Textarea
                                className="min-h-[36px] py-1 text-xs"
                                placeholder="Describe NC…"
                                value={piece.ncRemark ?? ""}
                                onChange={(e) =>
                                  updatePiece(joint.fieldJointId, piece.id, {
                                    ncRemark: e.target.value,
                                  })
                                }
                              />
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Not ready banner */}
          {!allSignedOff && !allReady && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Awaiting material check</p>
              <p className="mt-0.5">
                Clear at least one piece per joint and resolve any missing NC
                remarks.
              </p>
            </div>
          )}

          {/* Sign-off form */}
          {!allSignedOff && allReady && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Inspector
                </Label>
                <Select
                  value={inspector || undefined}
                  onValueChange={(value) => setInspector(value)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select inspector…" />
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

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  W-MC QC form number
                </Label>
                <Input
                  value={wmcFormNo}
                  onChange={(event) => setWmcFormNo(event.target.value)}
                  placeholder="WMC-2025-0000"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Remark (optional)
                </Label>
                <Textarea
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="Add any remarks…"
                  className="min-h-[60px] text-xs"
                />
              </div>
            </>
          )}

          {/* Cleared read-only */}
          {allSignedOff && (
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-800">
                  Field Material Check complete
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  {storeRecords[0]?.signedOffDate} by{" "}
                  {storeRecords[0]?.inspector}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    W-MC Form
                  </p>
                  <p className="font-mono text-slate-900">
                    {storeRecords[0]?.wmcFormNo ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Inspector
                  </p>
                  <p className="text-slate-900">
                    {storeRecords[0]?.inspector ?? "—"}
                  </p>
                </div>
              </div>

              {storeRecords[0]?.remark && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Remark</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {storeRecords[0].remark}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {!allSignedOff && (
          <SheetFooter className="shrink-0 flex-col items-stretch gap-2 border-t pt-4">
            {!allReady && (
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving || isSigning || pmLocked}
                className="w-full"
              >
                {isSaving ? "Saving…" : "Save draft"}
              </Button>
            )}
            {allReady && (
              <Button
                onClick={handleSignOff}
                disabled={!validation.ok || isSigning || pmLocked}
                className="w-full"
              >
                {isSigning ? "Signing off…" : "Sign off Field Material Check"}
              </Button>
            )}
            {!validation.ok && (
              <p className="text-center text-xs text-red-600">
                {validation.message}
              </p>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
