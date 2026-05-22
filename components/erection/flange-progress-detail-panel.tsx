"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useErectionStore } from "@/store/erection-store";
import { useFlangeBoltProgressStore, useNotificationsStore } from "@/store";
import {
  deriveFlangeBoltStatus,
  BOLTING_METHODS,
  TORQUE_TOOLS,
  type FlangeBoltProgressRecord,
  type BoltingMethod,
  type TorqueTool,
} from "@/lib/erection-stage";
import { QC_INSPECTORS } from "@/lib/spool-data";
import { cn } from "@/lib/utils";
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

interface FlangeProgressDetailPanelProps {
  fieldJointId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FlangeProgressDetailPanel({
  fieldJointId,
  open,
  onOpenChange,
}: FlangeProgressDetailPanelProps) {
  const router = useRouter();
  const fieldWelds = useErectionStore((state) => state.fieldWelds);
  const storeRecord = useFlangeBoltProgressStore((state) =>
    fieldJointId ? state.getRecord(fieldJointId) : undefined,
  );
  const pushNotification = useNotificationsStore(
    (state) => state.pushNotification,
  );

  const joint = useMemo(() => {
    if (!fieldJointId) return undefined;
    return fieldWelds.find((w) => w.id === fieldJointId);
  }, [fieldJointId, fieldWelds]);

  const status = useMemo(() => {
    return deriveFlangeBoltStatus(storeRecord);
  }, [storeRecord]);

  // Assign form state
  const [targetTorque, setTargetTorque] = useState<string>("");
  const [boltingMethod, setBoltingMethod] = useState<BoltingMethod | "">("");
  const [assignedBy, setAssignedBy] = useState<string>("");

  // Record form state
  const [boltedDate, setBoltedDate] = useState<string>("");
  const [jointer, setJointer] = useState<string>("");
  const [tagNo, setTagNo] = useState<string>("");
  const [reportNo, setReportNo] = useState<string>("");

  // Verify form state
  const [verifiedBy, setVerifiedBy] = useState<string>("");
  const [torqueTool, setTorqueTool] = useState<TorqueTool | "">("");
  const [remark, setRemark] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { locked: pmLocked } = usePmWriteLock();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    if (storeRecord) {
      setTargetTorque(storeRecord.targetTorqueNm?.toString() ?? "");
      setBoltingMethod(storeRecord.boltingMethod ?? "");
      setAssignedBy(storeRecord.assignedBy ?? "");
      setBoltedDate(storeRecord.boltedDate ?? today);
      setJointer(storeRecord.jointer ?? "");
      setTagNo(storeRecord.tagNo ?? "");
      setReportNo(storeRecord.reportNo ?? "");
      setVerifiedBy(storeRecord.verifiedBy ?? "");
      setTorqueTool(storeRecord.torqueTool ?? "");
      setRemark(storeRecord.remark ?? "");
      return;
    }
    // Reset when no record
    setTargetTorque("");
    setBoltingMethod("");
    setAssignedBy("");
    setBoltedDate(today);
    setJointer("");
    setTagNo("");
    setReportNo("");
    setVerifiedBy("");
    setTorqueTool("");
    setRemark("");
  }, [storeRecord, today, fieldJointId]);

  if (!fieldJointId || !joint) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[640px]">
          <p className="mt-8 text-sm text-slate-500">
            Select a flange bolt joint to view details.
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const torqueNum = Number.parseInt(targetTorque, 10);
  const assignValid =
    !Number.isNaN(torqueNum) &&
    torqueNum >= 50 &&
    torqueNum <= 2000 &&
    boltingMethod !== "" &&
    assignedBy !== "";

  const boltedDateValid = boltedDate !== "" && boltedDate <= today;
  const recordValid =
    boltedDateValid &&
    jointer.trim() !== "" &&
    tagNo.trim() !== "" &&
    reportNo.trim() !== "";

  const verifyValid = verifiedBy !== "" && torqueTool !== "";

  async function handleAssign() {
    if (!assignValid || !fieldJointId || !joint) return;
    setIsSubmitting(true);
    await new Promise((resolve) =>
      setTimeout(resolve, 600 + Math.random() * 200),
    );

    useFlangeBoltProgressStore.getState().assignTorque({
      fieldJointId,
      spoolNo: joint.spoolNo,
      targetTorqueNm: torqueNum,
      boltingMethod: boltingMethod as BoltingMethod,
      assignedBy,
    });

    setIsSubmitting(false);
    toast.success(`${joint.jointNo} torque assigned at ${torqueNum} Nm`);
  }

  async function handleRecordBoltUp() {
    if (!recordValid || !fieldJointId || !joint) return;
    setIsSubmitting(true);
    await new Promise((resolve) =>
      setTimeout(resolve, 600 + Math.random() * 200),
    );

    useFlangeBoltProgressStore.getState().recordBoltUp({
      fieldJointId,
      jointer: jointer.trim(),
      tagNo: tagNo.trim(),
      reportNo: reportNo.trim(),
    });

    setIsSubmitting(false);
    toast.success(`${joint.jointNo} bolt-up recorded`);
  }

  async function handleVerify() {
    if (!verifyValid || !fieldJointId || !joint) return;
    setIsSubmitting(true);
    await new Promise((resolve) =>
      setTimeout(resolve, 600 + Math.random() * 200),
    );

    useFlangeBoltProgressStore.getState().verifyTorque({
      fieldJointId,
      verifiedBy,
      torqueTool: torqueTool as TorqueTool,
      ...(remark.trim() ? { remark: remark.trim() } : {}),
    });

    setIsSubmitting(false);
    toast.success(`${joint.jointNo} torque verified`);
    onOpenChange(false);

    pushNotification({
      severity: "success",
      category: "erection",
      title: `${joint.jointNo}: torque verified`,
      description: `${joint.spoolNo} — ${storeRecord?.targetTorqueNm ?? "?"} Nm verified by ${verifiedBy} (${torqueTool})`,
      href: `/erection/flange-progress?status=Verified&joint=${fieldJointId}`,
      timestamp: new Date().toISOString(),
    });

    router.replace("/erection/flange-progress?status=Verified");
  }

  const statusColor: Record<typeof status, string> = {
    "Awaiting Torque": "border-slate-200 bg-slate-50 text-slate-600",
    "Torque Assigned": "border-amber-200 bg-amber-50 text-amber-700",
    Bolted: "border-violet-200 bg-violet-50 text-violet-700",
    Verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden sm:max-w-[640px]">
        <SheetHeader className="shrink-0 border-b pb-4">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-mono text-base">
              {joint.jointNo}
            </SheetTitle>
            <span className="text-sm text-slate-500">{joint.spoolNo}</span>
            <span
              className={cn(
                "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                statusColor[status],
              )}
            >
              {status}
            </span>
          </div>
          <SheetDescription>
            {status === "Verified"
              ? "Audit trail locked — all steps completed."
              : status === "Bolted"
                ? "Awaiting independent QC torque verification."
                : status === "Torque Assigned"
                  ? "Torque assigned — record bolt-up execution."
                  : "Awaiting torque assignment by QC."}
          </SheetDescription>
        </SheetHeader>
        <PmWriteLockBanner />

        <div className="flex-1 space-y-5 overflow-auto py-4">
          {/* Bridge card */}
          <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Field joint summary</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Dia:</span>{" "}
                <span className="font-medium">{joint.diaInch}</span>
              </div>
              <div>
                <span className="text-slate-500">Material:</span>{" "}
                <span className="font-medium">{joint.materialType}</span>
              </div>
              <div>
                <span className="text-slate-500">Area Zone:</span>{" "}
                <span className="font-medium">{joint.areaZone}</span>
              </div>
              <div>
                <span className="text-slate-500">WPS:</span>{" "}
                <span className="font-medium">{joint.wpsNo}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Erection status:</span>{" "}
                <span className="font-medium">{joint.erectionStatus}</span>
              </div>
            </div>
          </div>

          {/* Mode A — Assign */}
          {status === "Awaiting Torque" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-900">
                Assign torque
              </p>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">
                  Target torque (Nm)
                </Label>
                <Input
                  type="number"
                  min={50}
                  max={2000}
                  step={10}
                  value={targetTorque}
                  onChange={(e) => setTargetTorque(e.target.value)}
                  placeholder="e.g. 480"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">Bolting method</Label>
                <Select
                  value={boltingMethod || undefined}
                  onValueChange={(v) => setBoltingMethod(v as BoltingMethod)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select method…" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOLTING_METHODS.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">Assigned by</Label>
                <Select
                  value={assignedBy || undefined}
                  onValueChange={(v) => setAssignedBy(v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select QC inspector…" />
                  </SelectTrigger>
                  <SelectContent>
                    {QC_INSPECTORS.map((inspector) => (
                      <SelectItem
                        key={inspector}
                        value={inspector}
                        className="text-xs"
                      >
                        {inspector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-500">
                Set torque, method, and assigner.
              </div>
            </div>
          )}

          {/* Mode B — Record */}
          {status === "Torque Assigned" && (
            <div className="space-y-4">
              <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">Assignment summary</p>
                <p className="mt-1 text-xs">
                  {storeRecord?.targetTorqueNm} Nm ·{" "}
                  {storeRecord?.boltingMethod} · assigned by{" "}
                  {storeRecord?.assignedBy} on {storeRecord?.assignedDate}
                </p>
              </div>

              <p className="text-sm font-semibold text-slate-900">
                Record bolt-up
              </p>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">Bolt-up date</Label>
                <Input
                  type="date"
                  value={boltedDate}
                  max={today}
                  onChange={(e) => setBoltedDate(e.target.value)}
                  className="h-9 text-xs"
                />
                {boltedDate > today && (
                  <p className="text-xs text-red-600">
                    Date cannot be in the future.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">Jointer</Label>
                <Input
                  value={jointer}
                  onChange={(e) => setJointer(e.target.value)}
                  placeholder="JTR-XX"
                  maxLength={16}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">Tag No</Label>
                <Input
                  value={tagNo}
                  onChange={(e) => setTagNo(e.target.value)}
                  placeholder="TAG-XXXX"
                  maxLength={24}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">Report No</Label>
                <Input
                  value={reportNo}
                  onChange={(e) => setReportNo(e.target.value)}
                  placeholder="BR-19-2025-XXXX"
                  maxLength={24}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* Mode C — Verify */}
          {status === "Bolted" && (
            <div className="space-y-4">
              <div className="rounded-md border bg-violet-50 p-3 text-sm text-violet-800">
                <p className="font-medium">Assignment summary</p>
                <p className="mt-1 text-xs">
                  {storeRecord?.targetTorqueNm} Nm ·{" "}
                  {storeRecord?.boltingMethod} · assigned by{" "}
                  {storeRecord?.assignedBy} on {storeRecord?.assignedDate}
                </p>
              </div>

              <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium">Bolt-up summary</p>
                <p className="mt-1 text-xs">
                  {storeRecord?.boltedDate} · jointer {storeRecord?.jointer} ·
                  tag {storeRecord?.tagNo} · report {storeRecord?.reportNo}
                </p>
              </div>

              <p className="text-sm font-semibold text-slate-900">
                Verify torque
              </p>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">Verified by</Label>
                <Select
                  value={verifiedBy || undefined}
                  onValueChange={(v) => setVerifiedBy(v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select QC inspector…" />
                  </SelectTrigger>
                  <SelectContent>
                    {QC_INSPECTORS.map((inspector) => (
                      <SelectItem
                        key={inspector}
                        value={inspector}
                        className="text-xs"
                      >
                        {inspector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">Torque tool</Label>
                <Select
                  value={torqueTool || undefined}
                  onValueChange={(v) => setTorqueTool(v as TorqueTool)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select tool…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TORQUE_TOOLS.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-700">
                  Remark (optional)
                </Label>
                <Textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add any remarks…"
                  maxLength={240}
                  className="min-h-[60px] text-xs"
                />
              </div>
            </div>
          )}

          {/* Mode D — Done */}
          {status === "Verified" && (
            <div className="space-y-4">
              <div className="rounded-md border bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-medium">Assignment summary</p>
                <p className="mt-1 text-xs">
                  {storeRecord?.targetTorqueNm} Nm ·{" "}
                  {storeRecord?.boltingMethod} · assigned by{" "}
                  {storeRecord?.assignedBy} on {storeRecord?.assignedDate}
                </p>
              </div>

              <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium">Bolt-up summary</p>
                <p className="mt-1 text-xs">
                  {storeRecord?.boltedDate} · jointer {storeRecord?.jointer} ·
                  tag {storeRecord?.tagNo} · report {storeRecord?.reportNo}
                </p>
              </div>

              <div className="rounded-md border bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-medium">Verification summary</p>
                <p className="mt-1 text-xs">
                  {storeRecord?.verifiedDate} by {storeRecord?.verifiedBy} (
                  {storeRecord?.torqueTool})
                </p>
                {storeRecord?.remark && (
                  <p className="mt-1 text-xs">{storeRecord.remark}</p>
                )}
              </div>

              <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-500">
                Verified {storeRecord?.verifiedDate} by{" "}
                {storeRecord?.verifiedBy} ({storeRecord?.torqueTool}) — audit
                trail locked
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(status === "Awaiting Torque" ||
          status === "Torque Assigned" ||
          status === "Bolted") && (
          <SheetFooter className="shrink-0 border-t pt-4">
            {status === "Awaiting Torque" && (
              <>
                <Button
                  onClick={handleAssign}
                  disabled={!assignValid || isSubmitting || pmLocked}
                  className="w-full"
                >
                  {isSubmitting ? "Assigning…" : "Assign torque"}
                </Button>
                {!assignValid && (
                  <p className="mt-2 text-center text-xs text-red-600">
                    Set torque, method, and assigner.
                  </p>
                )}
              </>
            )}
            {status === "Torque Assigned" && (
              <>
                <Button
                  onClick={handleRecordBoltUp}
                  disabled={!recordValid || isSubmitting || pmLocked}
                  className="w-full"
                >
                  {isSubmitting ? "Recording…" : "Record bolt-up"}
                </Button>
                {!recordValid && (
                  <p className="mt-2 text-center text-xs text-red-600">
                    {!boltedDateValid
                      ? boltedDate > today
                        ? "Date cannot be in the future."
                        : "Enter bolt-up date."
                      : !jointer.trim()
                        ? "Enter jointer code."
                        : !tagNo.trim()
                          ? "Enter tag number."
                          : "Enter report number."}
                  </p>
                )}
              </>
            )}
            {status === "Bolted" && (
              <>
                <Button
                  onClick={handleVerify}
                  disabled={!verifyValid || isSubmitting || pmLocked}
                  className="w-full"
                >
                  {isSubmitting ? "Verifying…" : "Verify torque"}
                </Button>
                {!verifyValid && (
                  <p className="mt-2 text-center text-xs text-red-600">
                    Select verifier and torque tool.
                  </p>
                )}
              </>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
