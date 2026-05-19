"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  useToSiteStore,
  useErectedStore,
  useWeldedBoltedStore,
  useNotificationsStore,
  useErectionStore,
  useSpoolErectionStages,
  useSpoolFlangeBoltRollup,
} from "@/store";
import { QC_INSPECTORS } from "@/lib/spool-data";
import {
  computeSpoolWBRollup,
  type WeldedBoltedRecord,
} from "@/lib/erection-stage";
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

interface WeldedBoltedDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildEmptyRecord(spoolNo: string): WeldedBoltedRecord {
  return {
    spoolNo,
    confirmedDate: "",
    confirmedBy: "",
    w24FormNo: "",
    weldedJointCount: 0,
    boltedJointCount: 0,
    remark: "",
  };
}

export function WeldedBoltedDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: WeldedBoltedDetailPanelProps) {
  const router = useRouter();
  const toSiteRecord = useToSiteStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const erectedRecord = useErectedStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const storeRecord = useWeldedBoltedStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const fieldWelds = useErectionStore((state) => state.fieldWelds);
  const stages = useSpoolErectionStages();

  const [form, setForm] = useState<WeldedBoltedRecord | null>(null);
  const [confirmedBy, setConfirmedBy] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const spoolFieldWelds = useMemo(() => {
    if (!spoolNo) return [];
    return fieldWelds.filter((w) => w.spoolNo === spoolNo);
  }, [spoolNo, fieldWelds]);

  const rollup = useMemo(() => {
    if (!spoolNo) {
      return {
        weldJointsTotal: 0,
        weldJointsDone: 0,
        boltJointsTotal: 0,
        boltJointsDone: 0,
        allDone: false,
      };
    }
    return computeSpoolWBRollup(spoolNo, fieldWelds);
  }, [spoolNo, fieldWelds]);

  useEffect(() => {
    if (storeRecord) {
      setForm(JSON.parse(JSON.stringify(storeRecord)));
      setConfirmedBy(storeRecord.confirmedBy);
      return;
    }

    if (spoolNo) {
      setForm(buildEmptyRecord(spoolNo));
      setConfirmedBy("");
      return;
    }

    setForm(null);
    setConfirmedBy("");
  }, [spoolNo, storeRecord]);

  const stage = useMemo(() => {
    if (!spoolNo) return "Not Started";
    return (
      stages.find((item) => item.spoolNo === spoolNo)?.stage ?? "Not Started"
    );
  }, [spoolNo, stages]);

  const validation = useMemo(() => {
    if (storeRecord) return { ok: true, message: "" };
    if (!rollup.allDone) {
      const pendingWeld = rollup.weldJointsTotal - rollup.weldJointsDone;
      const pendingBolt = rollup.boltJointsTotal - rollup.boltJointsDone;
      const parts: string[] = [];
      if (pendingWeld > 0)
        parts.push(`${pendingWeld} weld joint${pendingWeld === 1 ? "" : "s"}`);
      if (pendingBolt > 0)
        parts.push(`${pendingBolt} bolt joint${pendingBolt === 1 ? "" : "s"}`);
      return {
        ok: false,
        message: `Cannot confirm — ${parts.join(" and ")} not yet welded/bolted.`,
      };
    }
    if (!confirmedBy) {
      return { ok: false, message: "Select the QC engineer who confirmed." };
    }
    if (!form?.w24FormNo.trim()) {
      return { ok: false, message: "Enter the W-24 QC form number." };
    }
    return { ok: true, message: "" };
  }, [storeRecord, rollup, confirmedBy, form?.w24FormNo]);

  if (!spoolNo || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[640px]">
          <p className="mt-8 text-sm text-slate-500">
            Select a spool to view welded/bolted details.
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const isConfirmed = !!storeRecord;
  const isReady = rollup.allDone && !isConfirmed;
  const isInProgress = !rollup.allDone && !isConfirmed;

  const pendingWeld = rollup.weldJointsTotal - rollup.weldJointsDone;
  const pendingBolt = rollup.boltJointsTotal - rollup.boltJointsDone;

  const handleSubmit = async () => {
    if (!validation.ok || !confirmedBy) return;

    setIsSubmitting(true);
    await new Promise((resolve) =>
      setTimeout(resolve, 600 + Math.random() * 200),
    );

    useWeldedBoltedStore.getState().confirmWeldedBolted({
      spoolNo,
      confirmedBy,
      w24FormNo: form.w24FormNo.trim(),
      weldedJointCount: rollup.weldJointsDone,
      boltedJointCount: rollup.boltJointsDone,
      remark: form.remark?.trim() || undefined,
    });

    setIsSubmitting(false);
    onOpenChange(false);

    toast.success(`${spoolNo} welded/bolted confirmed`);

    useNotificationsStore.getState().pushNotification({
      severity: "success",
      category: "weld_progress",
      title: `${spoolNo}: Welded/Bolted confirmed`,
      description: `W-24 ${form.w24FormNo.trim()} confirmed by ${confirmedBy}`,
      href: "/erection/dashboard",
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
                stage === "Welded/Bolted"
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : stage === "Erected"
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              {stage}
            </span>
          </div>
          <SheetDescription>
            {isConfirmed
              ? `Confirmed on ${storeRecord.confirmedDate} by ${storeRecord.confirmedBy}.`
              : isReady
                ? "All joints are welded/bolted. Ready for QC confirmation."
                : `Joints in progress — ${pendingWeld + pendingBolt} remaining.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-auto py-4">
          {/* Erected summary bridge */}
          <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Erected summary</p>
            <p className="mt-1">
              Date: {erectedRecord?.erectedDate ?? "—"} by{" "}
              {erectedRecord?.erectedBy ?? "—"}
            </p>
            <p>Location: {erectedRecord?.placementLocation ?? "—"}</p>
            {erectedRecord?.elevation && (
              <p>Elevation: {erectedRecord.elevation}</p>
            )}
            {erectedRecord?.remark && (
              <p className="mt-1 text-slate-600">
                Remark: {erectedRecord.remark}
              </p>
            )}
          </div>

          {/* Joints rollup table */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              Joints rollup
            </p>
            {spoolFieldWelds.length === 0 ? (
              <p className="text-sm text-slate-500">
                No field joints for this spool.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Joint No
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Type
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Welder
                      </th>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {spoolFieldWelds.map((weld) => (
                      <tr key={weld.id} className="border-b border-slate-100">
                        <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-900">
                          {weld.jointNo}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">
                          {weld.fieldJointType}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">
                          {weld.welderCode}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium",
                              weld.erectionStatus === "RFT"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : weld.erectionStatus === "Supported"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : weld.erectionStatus === "Welded" ||
                                      weld.erectionStatus === "Bolted"
                                    ? "border-violet-200 bg-violet-50 text-violet-700"
                                    : weld.erectionStatus === "Erected"
                                      ? "border-sky-200 bg-sky-50 text-sky-700"
                                      : weld.erectionStatus === "To Site"
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-slate-200 bg-slate-50 text-slate-500",
                            )}
                          >
                            {weld.erectionStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Flange bolt audit bridge */}
          <FlangeBoltAuditCard spoolNo={spoolNo} />

          {/* Summary counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-slate-50 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Welded
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {rollup.weldJointsDone}
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  / {rollup.weldJointsTotal}
                </span>
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Bolted
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {rollup.boltJointsDone}
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  / {rollup.boltJointsTotal}
                </span>
              </p>
            </div>
          </div>

          {/* In Progress banner */}
          {isInProgress && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Cannot confirm</p>
              <p className="mt-0.5">
                {pendingWeld > 0 &&
                  `${pendingWeld} weld joint${pendingWeld === 1 ? "" : "s"} not yet welded.`}
                {pendingWeld > 0 && pendingBolt > 0 && " "}
                {pendingBolt > 0 &&
                  `${pendingBolt} bolt joint${pendingBolt === 1 ? "" : "s"} not yet bolted.`}
              </p>
            </div>
          )}

          {/* Ready to Confirm form */}
          {isReady && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  QC engineer
                </Label>
                <Select
                  value={confirmedBy || undefined}
                  onValueChange={setConfirmedBy}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select inspector&hellip;" />
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
                <Label className="text-sm font-semibold text-slate-900">
                  W-24 QC form number
                </Label>
                <Input
                  value={form.w24FormNo}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, w24FormNo: event.target.value }
                        : current,
                    )
                  }
                  placeholder="W24-2025-0000"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Remark (optional)
                </Label>
                <Textarea
                  value={form.remark ?? ""}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, remark: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Add any remarks&hellip;"
                  className="min-h-[60px] text-xs"
                />
              </div>
            </>
          )}

          {/* Confirmed read-only */}
          {isConfirmed && (
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-800">
                  Confirmed
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  {storeRecord.confirmedDate} by {storeRecord.confirmedBy}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    W-24 Form
                  </p>
                  <p className="font-mono text-slate-900">
                    {storeRecord.w24FormNo}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    QC Engineer
                  </p>
                  <p className="text-slate-900">{storeRecord.confirmedBy}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Welded joints (snapshot)
                  </p>
                  <p className="text-slate-900">
                    {storeRecord.weldedJointCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Bolted joints (snapshot)
                  </p>
                  <p className="text-slate-900">
                    {storeRecord.boltedJointCount}
                  </p>
                </div>
              </div>

              {storeRecord.remark && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Remark</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {storeRecord.remark}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {isReady && (
          <SheetFooter className="shrink-0 border-t pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!validation.ok || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Confirming&hellip;" : "Confirm Welded/Bolted"}
            </Button>
            {!validation.ok && (
              <p className="mt-2 text-center text-xs text-red-600">
                {validation.message}
              </p>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FlangeBoltAuditCard({ spoolNo }: { spoolNo: string }) {
  const flangeRollup = useSpoolFlangeBoltRollup(spoolNo);

  if (flangeRollup.totalBolts === 0) return null;

  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Flange bolt audit (§19.2.1)
        </p>
        <Link
          href={`/erection/flange-progress?status=All&spool=${encodeURIComponent(spoolNo)}`}
          className="text-xs text-sky-600 hover:underline"
        >
          Open audit →
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-800">
        <span className="font-semibold">{flangeRollup.verified}</span>
        <span className="text-slate-500">
          {" "}
          / {flangeRollup.totalBolts} verified
        </span>
        <span className="ml-2 text-slate-500">
          · {flangeRollup.assigned} assigned · {flangeRollup.bolted} bolted
        </span>
      </p>
    </div>
  );
}
