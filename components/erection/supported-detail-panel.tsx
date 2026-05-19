"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useWeldedBoltedStore,
  useSupportsStore,
  useNotificationsStore,
  useSpoolErectionStages,
} from "@/store";
import {
  AREA_SUPERVISORS,
  type AreaSupervisor,
  type SupportItem,
  type SupportStatus,
  type SupportedRecord,
  computeSpoolSupportRollup,
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

interface SupportedDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildEmptyRecord(spoolNo: string): SupportedRecord {
  return {
    spoolNo,
    confirmedDate: "",
    confirmedBy: AREA_SUPERVISORS[0],
    w23FormNo: "",
    totalSupports: 0,
    remark: "",
  };
}

const STATUS_OPTIONS: SupportStatus[] = ["Not Started", "Erected", "Welded"];

export function SupportedDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: SupportedDetailPanelProps) {
  const wbRecord = useWeldedBoltedStore((state) =>
    spoolNo ? state.records.find((r) => r.spoolNo === spoolNo) : undefined,
  );
  const storeRecord = useSupportsStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const supportItems = useSupportsStore((state) => state.items);
  const stages = useSpoolErectionStages();

  const [form, setForm] = useState<SupportedRecord | null>(null);
  const [confirmedBy, setConfirmedBy] = useState<AreaSupervisor | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const spoolSupports = useMemo(() => {
    if (!spoolNo) return [];
    return supportItems.filter((item) => item.spoolNo === spoolNo);
  }, [spoolNo, supportItems]);

  const rollup = useMemo(() => {
    if (!spoolNo) {
      return { total: 0, erected: 0, welded: 0, allWelded: false };
    }
    return computeSpoolSupportRollup(spoolNo, supportItems);
  }, [spoolNo, supportItems]);

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
    return stages.find((item) => item.spoolNo === spoolNo)?.stage ?? "Not Started";
  }, [spoolNo, stages]);

  const validation = useMemo(() => {
    if (storeRecord) return { ok: true, message: "" };
    if (!rollup.allWelded) {
      const pending = rollup.total - rollup.welded;
      return {
        ok: false,
        message: `Cannot confirm — ${pending} support${pending === 1 ? "" : "s"} not yet welded.`,
      };
    }
    if (!confirmedBy) {
      return { ok: false, message: "Select the area supervisor who confirmed." };
    }
    if (!form?.w23FormNo.trim()) {
      return { ok: false, message: "Enter the W-23 QC form number." };
    }
    return { ok: true, message: "" };
  }, [storeRecord, rollup, confirmedBy, form?.w23FormNo]);

  if (!spoolNo || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[640px]">
          <p className="mt-8 text-sm text-slate-500">
            Select a spool to view support details.
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const isConfirmed = !!storeRecord;
  const isReady = rollup.allWelded && !isConfirmed;
  const isInProgress = !rollup.allWelded && !isConfirmed;

  const handleStatusChange = async (item: SupportItem, status: SupportStatus) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    useSupportsStore.getState().setSupportStatus(item.id, status);
    toast.success(`${item.tag} marked as ${status.toLowerCase()}`);
  };

  const handleSubmit = async () => {
    if (!validation.ok || !confirmedBy) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 200));

    useSupportsStore.getState().confirmSupported({
      spoolNo,
      confirmedBy,
      w23FormNo: form.w23FormNo.trim(),
      totalSupports: rollup.total,
      remark: form.remark?.trim() || undefined,
    });

    setIsSubmitting(false);
    onOpenChange(false);

    toast.success(`${spoolNo} supported confirmed`);

    useNotificationsStore.getState().pushNotification({
      severity: "success",
      category: "weld_progress",
      title: `${spoolNo}: Supported confirmed`,
      description: `W-23 ${form.w23FormNo.trim()} confirmed by ${confirmedBy}`,
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
                stage === "Supported"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : stage === "Welded/Bolted"
                    ? "border-violet-200 bg-violet-50 text-violet-700"
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
                ? "All supports are welded. Ready for QC confirmation."
                : `Supports in progress — ${rollup.total - rollup.welded} remaining.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-auto py-4">
          {/* W&B summary bridge */}
          <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Welded / Bolted summary</p>
            <p className="mt-1">
              Confirmed: {wbRecord?.confirmedDate ?? "—"} by{" "}
              {wbRecord?.confirmedBy ?? "—"}
            </p>
            <p>W-24: {wbRecord?.w24FormNo ?? "—"}</p>
            {wbRecord?.remark && (
              <p className="mt-1 text-slate-600">Remark: {wbRecord.remark}</p>
            )}
          </div>

          {/* Supports table */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Supports</p>
            {spoolSupports.length === 0 ? (
              <p className="text-sm text-slate-500">No support items for this spool.</p>
            ) : (
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
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {spoolSupports.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="whitespace-nowrap px-2 py-1.5 font-mono text-slate-900">
                          {item.tag}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">
                          {item.type}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {isConfirmed ? (
                            <span
                              className={cn(
                                "inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium",
                                item.status === "Welded"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : item.status === "Erected"
                                    ? "border-sky-200 bg-sky-50 text-sky-700"
                                    : "border-slate-200 bg-slate-50 text-slate-500",
                              )}
                            >
                              {item.status}
                            </span>
                          ) : (
                            <Select
                              value={item.status}
                              onValueChange={(value) =>
                                handleStatusChange(item, value as SupportStatus)
                              }
                            >
                              <SelectTrigger className="h-7 w-[140px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((status) => (
                                  <SelectItem
                                    key={status}
                                    value={status}
                                    className="text-xs"
                                  >
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-slate-50 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Erected
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {rollup.erected}
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  / {rollup.total}
                </span>
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Welded
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {rollup.welded}
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  / {rollup.total}
                </span>
              </p>
            </div>
          </div>

          {/* In Progress banner */}
          {isInProgress && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Cannot confirm</p>
              <p className="mt-0.5">
                {rollup.total - rollup.welded} support{rollup.total - rollup.welded === 1 ? "" : "s"}{" "}
                not yet welded.
              </p>
            </div>
          )}

          {/* Ready to Confirm form */}
          {isReady && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Area supervisor
                </Label>
                <Select
                  value={confirmedBy || undefined}
                  onValueChange={(value) => setConfirmedBy(value as AreaSupervisor)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select supervisor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_SUPERVISORS.map((supervisor) => (
                      <SelectItem key={supervisor} value={supervisor} className="text-xs">
                        {supervisor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  W-23 QC form number
                </Label>
                <Input
                  value={form.w23FormNo}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, w23FormNo: event.target.value }
                        : current,
                    )
                  }
                  placeholder="W23-2025-0000"
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
                  placeholder="Add any remarks…"
                  className="min-h-[60px] text-xs"
                />
              </div>
            </>
          )}

          {/* Confirmed read-only */}
          {isConfirmed && (
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-800">Confirmed</p>
                <p className="mt-1 text-xs text-emerald-700">
                  {storeRecord.confirmedDate} by {storeRecord.confirmedBy}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500">W-23 Form</p>
                  <p className="font-mono text-slate-900">{storeRecord.w23FormNo}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Supervisor</p>
                  <p className="text-slate-900">{storeRecord.confirmedBy}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total supports (snapshot)</p>
                  <p className="text-slate-900">{storeRecord.totalSupports}</p>
                </div>
              </div>

              {storeRecord.remark && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Remark</p>
                  <p className="mt-1 text-sm text-slate-700">{storeRecord.remark}</p>
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
              {isSubmitting ? "Confirming…" : "Confirm Supported"}
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
