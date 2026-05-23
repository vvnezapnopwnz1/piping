"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  usePaintStore,
  useNotificationsStore,
  useSpoolStages,
} from "@/store";
import {
  PAINT_SYSTEMS,
  PAINT_SUBCONTRACTORS,
  QC_INSPECTORS,
  STAGE_COLOR,
  type PaintRecord,
  type PaintSystem,
  type PaintSubcontractor,
} from "@/lib/spool-data";
import { cn } from "@/lib/utils";

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
import { W10pPdfButton } from "@/components/fabrication/w10p-pdf-button";

interface PaintDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildEmptyRecord(spoolNo: string): PaintRecord {
  return { spoolNo };
}

export function PaintDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: PaintDetailPanelProps) {
  const router = useRouter();
  const storeRecord = usePaintStore((s) =>
    spoolNo ? s.getRecord(spoolNo) : undefined,
  );
  const stages = useSpoolStages();
  const stage = spoolNo
    ? (stages.get(spoolNo) ?? "Not Started")
    : "Not Started";

  const [form, setForm] = useState<PaintRecord | null>(null);
  const [paintSystem, setPaintSystem] = useState<PaintSystem | "">("");
  const [subcontractor, setSubcontractor] = useState<PaintSubcontractor | "">("");
  const [remark, setRemark] = useState("");
  const [dft, setDft] = useState<string>("");
  const [inspector, setInspector] = useState<string>(QC_INSPECTORS[0]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (storeRecord) {
      setForm(JSON.parse(JSON.stringify(storeRecord)));
      setPaintSystem(storeRecord.paintSystem ?? "");
      setSubcontractor(storeRecord.subcontractor ?? "");
      setRemark(storeRecord.dispatchRemark ?? "");
      setDft(storeRecord.dftMicrons !== undefined ? String(storeRecord.dftMicrons) : "");
      setInspector(storeRecord.finalQCInspector ?? QC_INSPECTORS[0]);
    } else if (spoolNo) {
      setForm(buildEmptyRecord(spoolNo));
      setPaintSystem("");
      setSubcontractor("");
      setRemark("");
      setDft("");
      setInspector(QC_INSPECTORS[0]);
    } else {
      setForm(null);
    }
  }, [storeRecord, spoolNo]);

  const colors = STAGE_COLOR[stage];

  const dispatchValidation = useMemo(() => {
    if (!paintSystem || !subcontractor) {
      return { ok: false, message: "Pick a paint system and subcontractor before dispatch." };
    }
    return { ok: true, message: "" };
  }, [paintSystem, subcontractor]);

  const signOffValidation = useMemo(() => {
    const dftNum = dft.trim() === "" ? NaN : Number(dft);
    if (Number.isNaN(dftNum) || dftNum < 50 || dftNum > 800) {
      return { ok: false, message: "Enter DFT between 50 and 800 µm." };
    }
    if (!inspector) {
      return { ok: false, message: "Pick a final QC inspector." };
    }
    return { ok: true, message: "" };
  }, [dft, inspector]);

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

  const isDispatched = !!form.dispatchDate;
  const isSignedOff = !!form.finalQCSignedOffDate;

  const handleDispatch = async () => {
    if (!dispatchValidation.ok || !paintSystem || !subcontractor) return;
    setIsDispatching(true);
    await new Promise((r) => setTimeout(r, 700));

    usePaintStore.getState().dispatch({
      spoolNo: form.spoolNo,
      paintSystem,
      subcontractor,
      remark: remark || undefined,
    });

    setIsDispatching(false);
    onOpenChange(false);

    toast.success(`${form.spoolNo} dispatched to ${subcontractor}`);

    const pushNotification = useNotificationsStore.getState().pushNotification;
    pushNotification({
      severity: "info",
      category: "weld_progress",
      title: `${form.spoolNo}: dispatched to paint shop`,
      description: `Sent to ${subcontractor} (${paintSystem})`,
      href: "/fabrication/paint",
    });

    router.replace("/fabrication/paint?status=InShop");
  };

  const handleSignOff = async () => {
    if (!signOffValidation.ok) return;
    setIsSigning(true);
    await new Promise((r) => setTimeout(r, 700));

    const dftNum = Number(dft);
    usePaintStore.getState().signOffPaint({
      spoolNo: form.spoolNo,
      dftMicrons: dftNum,
      finalQCInspector: inspector,
    });

    setIsSigning(false);
    onOpenChange(false);

    toast.success(`${form.spoolNo} painted (DFT ${dftNum} µm)`);

    const pushNotification = useNotificationsStore.getState().pushNotification;
    pushNotification({
      severity: "info",
      category: "weld_progress",
      title: `${form.spoolNo}: painted`,
      description: `Final QC signed by ${inspector} (DFT ${dftNum} µm)`,
      href: "/fabrication/paint",
    });

    router.replace("/fabrication/paint?status=Painted");
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
            {isSignedOff
              ? `Painted on ${form.finalQCSignedOffDate} — DFT ${form.dftMicrons} µm — ${form.finalQCInspector}`
              : isDispatched
                ? `Dispatched on ${form.dispatchDate} — awaiting return QC`
                : "Awaiting paint dispatch"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-auto py-4 space-y-5">
          {isDispatched && (
            <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700">
              Dispatched {form.dispatchDate} to {form.subcontractor}
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-900">
              Paint system
            </Label>
            <Select
              value={paintSystem || "__empty__"}
              onValueChange={(v) => setPaintSystem(v as PaintSystem)}
              disabled={isDispatched}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select paint system…" />
              </SelectTrigger>
              <SelectContent>
                {PAINT_SYSTEMS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-900">
              Subcontractor
            </Label>
            <Select
              value={subcontractor || "__empty__"}
              onValueChange={(v) => setSubcontractor(v as PaintSubcontractor)}
              disabled={isDispatched}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select subcontractor…" />
              </SelectTrigger>
              <SelectContent>
                {PAINT_SUBCONTRACTORS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isDispatched && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Dispatch remark
              </Label>
              <Textarea
                placeholder="Optional note…"
                className="text-xs min-h-[60px]"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          )}

          {stage === "Sent to Paint" && !isSignedOff && (
            <div className="space-y-4 border-t pt-4">
              <div className="text-sm font-semibold text-slate-900">
                Return from paint shop
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-600">DFT (µm)</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  value={dft}
                  onChange={(e) => setDft(e.target.value)}
                  placeholder="e.g. 285"
                />
                {!signOffValidation.ok && signOffValidation.message.includes("DFT") && (
                  <p className="text-xs text-red-600">{signOffValidation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-600">Final QC inspector</Label>
                <Select value={inspector} onValueChange={setInspector}>
                  <SelectTrigger className="h-9 text-xs">
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
                {!signOffValidation.ok && signOffValidation.message.includes("inspector") && (
                  <p className="text-xs text-red-600">{signOffValidation.message}</p>
                )}
              </div>
            </div>
          )}

          {isSignedOff && (
            <div className="space-y-4 border-t pt-4">
              <div className="text-sm font-semibold text-slate-900">
                Return from paint shop
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div>DFT: {form.dftMicrons} µm</div>
                <div>Inspector: {form.finalQCInspector}</div>
                <div>Returned: {form.returnDate}</div>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-col gap-3 border-t pt-4">
          {!isDispatched && (
            <>
              {!dispatchValidation.ok && (
                <p className="text-xs text-red-600">{dispatchValidation.message}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={handleDispatch}
                  disabled={!dispatchValidation.ok || isDispatching}
                >
                  {isDispatching ? "Dispatching…" : "Dispatch to paint shop"}
                </Button>
              </div>
            </>
          )}

          {isDispatched && !isSignedOff && (
            <>
              {!signOffValidation.ok && (
                <p className="text-xs text-red-600">{signOffValidation.message}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={handleSignOff}
                  disabled={!signOffValidation.ok || isSigning}
                >
                  {isSigning ? "Signing…" : "Sign off final QC"}
                </Button>
              </div>
            </>
          )}

          {isSignedOff && form ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <W10pPdfButton spoolNo={spoolNo!} record={form} />
              <p className="text-sm text-slate-500">
                Painted on {form.finalQCSignedOffDate} — DFT {form.dftMicrons} µm — {form.finalQCInspector}
              </p>
            </div>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
