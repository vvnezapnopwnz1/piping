"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useLaydownStore,
  useNotificationsStore,
  useSpoolErectionStages,
  useToSiteStore,
} from "@/store";
import {
  AREA_SUPERVISORS,
  type AreaSupervisor,
  type ToSiteRecord,
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

interface ToSiteDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildEmptyRecord(spoolNo: string): ToSiteRecord {
  return {
    spoolNo,
    receivedDate: "",
    receivedBy: AREA_SUPERVISORS[0],
    w24FormNo: "",
    remark: "",
  };
}

export function ToSiteDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: ToSiteDetailPanelProps) {
  const laydownRecord = useLaydownStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const storeRecord = useToSiteStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const stages = useSpoolErectionStages();
  const [form, setForm] = useState<ToSiteRecord | null>(null);
  const [receivedBy, setReceivedBy] = useState<AreaSupervisor | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (storeRecord) {
      setForm(JSON.parse(JSON.stringify(storeRecord)));
      setReceivedBy(storeRecord.receivedBy as AreaSupervisor);
      return;
    }

    if (spoolNo) {
      setForm(buildEmptyRecord(spoolNo));
      setReceivedBy("");
      return;
    }

    setForm(null);
    setReceivedBy("");
  }, [spoolNo, storeRecord]);

  const stage = useMemo(() => {
    if (!spoolNo) {
      return "Not Started";
    }
    return (
      stages.find((item) => item.spoolNo === spoolNo)?.stage ?? "Not Started"
    );
  }, [spoolNo, stages]);

  const validation = useMemo(() => {
    if (!form?.w24FormNo.trim()) {
      return { ok: false, message: "Enter the W-24 QC form number." };
    }
    if (!receivedBy) {
      return {
        ok: false,
        message: "Select the area supervisor who confirmed receipt.",
      };
    }
    return { ok: true, message: "" };
  }, [form?.w24FormNo, receivedBy]);

  if (!spoolNo || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[560px]">
          <p className="mt-8 text-sm text-slate-500">
            Select a spool to view receipt details.
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const isReceived = !!storeRecord;

  const handleSubmit = async () => {
    if (!validation.ok || !receivedBy) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) =>
      setTimeout(resolve, 600 + Math.random() * 200),
    );

    useToSiteStore.getState().markReceived({
      spoolNo,
      receivedBy,
      w24FormNo: form.w24FormNo.trim(),
      remark: form.remark?.trim() || undefined,
    });

    setIsSubmitting(false);
    onOpenChange(false);

    toast.success(`${spoolNo} received at site`);

    useNotificationsStore.getState().pushNotification({
      severity: "success",
      category: "weld_progress",
      title: `${spoolNo}: received at site`,
      description: `W-24 ${form.w24FormNo.trim()} confirmed by ${receivedBy}`,
      href: "/erection/dashboard",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden sm:max-w-[560px]">
        <SheetHeader className="shrink-0 border-b pb-4">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-mono text-base">{spoolNo}</SheetTitle>
            <span
              className={cn(
                "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                stage === "To Site"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              {stage}
            </span>
          </div>
          <SheetDescription>
            {isReceived
              ? `Received on ${storeRecord.receivedDate} from W-24 confirmation.`
              : "Confirm site receipt from the W-24 QC form once the area supervisor accepts the spool."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-auto py-4">
          <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Laydown bridge</p>
            <p className="mt-1">
              Yard location: {laydownRecord?.yardLocation ?? "—"}
            </p>
            <p>
              Placed: {laydownRecord?.placedDate ?? "—"} by{" "}
              {laydownRecord?.placedBy ?? "—"}
            </p>
            <p>
              Released: {laydownRecord?.releasedToSiteDate ?? "—"} by{" "}
              {laydownRecord?.releasedBy ?? "—"}
            </p>
          </div>

          {!isReceived ? (
            <>
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
                  placeholder="W24-2025-0142"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Area supervisor
                </Label>
                <Select
                  value={receivedBy || undefined}
                  onValueChange={(value) =>
                    setReceivedBy(value as AreaSupervisor)
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select supervisor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_SUPERVISORS.map((supervisor) => (
                      <SelectItem
                        key={supervisor}
                        value={supervisor}
                        className="text-xs"
                      >
                        {supervisor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Remark
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
                  placeholder="Optional handover note from site receipt."
                  className="min-h-24 text-xs"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3 rounded-md border bg-white p-4 text-sm">
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  W-24 QC form
                </span>
                <span className="font-mono text-slate-900">
                  {storeRecord.w24FormNo}
                </span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Received date
                </span>
                <span className="text-slate-900">
                  {storeRecord.receivedDate}
                </span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Area supervisor
                </span>
                <span className="text-slate-900">{storeRecord.receivedBy}</span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Remark
                </span>
                <span className="text-slate-900">
                  {storeRecord.remark?.trim() || "No remark recorded."}
                </span>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-col items-stretch gap-2 border-t pt-4">
          {!isReceived ? (
            <>
              <Button
                onClick={handleSubmit}
                disabled={!validation.ok || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Marking…" : "Mark Received"}
              </Button>
              {!validation.ok && (
                <p className="text-center text-xs text-slate-500">
                  {validation.message}
                </p>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-slate-500">
              Received {storeRecord.receivedDate} by {storeRecord.receivedBy}{" "}
              via {storeRecord.w24FormNo}.
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
