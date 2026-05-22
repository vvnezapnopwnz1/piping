"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useToSiteStore,
  useErectedStore,
  useNotificationsStore,
  useSpoolErectionStages,
  useFieldMaterialCheckStore,
  useErectionStore,
} from "@/store";
import {
  AREA_SUPERVISORS,
  PLACEMENT_LOCATIONS,
  computeSpoolFieldMCRollup,
  type AreaSupervisor,
  type ErectedRecord,
  type PlacementLocation,
} from "@/lib/erection-stage";
import { cn } from "@/lib/utils";
import { usePmWriteLock } from "@/lib/pm-write-lock";
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner";
import { W24PdfButton } from "./w24-pdf-button";

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

interface ErectedDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildEmptyRecord(spoolNo: string): ErectedRecord {
  return {
    spoolNo,
    erectedDate: "",
    erectedBy: AREA_SUPERVISORS[0],
    w24FormNo: "",
    placementLocation: PLACEMENT_LOCATIONS[0],
    elevation: "",
    remark: "",
  };
}

export function ErectedDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: ErectedDetailPanelProps) {
  const toSiteRecord = useToSiteStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const storeRecord = useErectedStore((state) =>
    spoolNo ? state.getRecord(spoolNo) : undefined,
  );
  const stages = useSpoolErectionStages();
  const allFieldWelds = useErectionStore((state) => state.fieldWelds);
  const allMcRecords = useFieldMaterialCheckStore((state) => state.records);
  const fieldWelds = useMemo(
    () => (spoolNo ? allFieldWelds.filter((w) => w.spoolNo === spoolNo) : []),
    [spoolNo, allFieldWelds],
  );
  const mcRecords = useMemo(
    () => (spoolNo ? allMcRecords.filter((r) => r.spoolNo === spoolNo) : []),
    [spoolNo, allMcRecords],
  );
  const [form, setForm] = useState<ErectedRecord | null>(null);
  const [erectedBy, setErectedBy] = useState<AreaSupervisor | "">("");
  const [placementLocation, setPlacementLocation] = useState<
    PlacementLocation | ""
  >("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { locked: pmLocked } = usePmWriteLock();

  useEffect(() => {
    if (storeRecord) {
      setForm(JSON.parse(JSON.stringify(storeRecord)));
      setErectedBy(storeRecord.erectedBy as AreaSupervisor);
      setPlacementLocation(storeRecord.placementLocation as PlacementLocation);
      return;
    }

    if (spoolNo) {
      setForm(buildEmptyRecord(spoolNo));
      setErectedBy("");
      setPlacementLocation("");
      return;
    }

    setForm(null);
    setErectedBy("");
    setPlacementLocation("");
  }, [spoolNo, storeRecord]);

  const stage = useMemo(() => {
    if (!spoolNo) {
      return "Not Started";
    }
    return (
      stages.find((item) => item.spoolNo === spoolNo)?.stage ?? "Not Started"
    );
  }, [spoolNo, stages]);

  const mcRollup = useMemo(() => {
    if (!spoolNo) return undefined;
    return computeSpoolFieldMCRollup(spoolNo, fieldWelds, mcRecords);
  }, [spoolNo, fieldWelds, mcRecords]);

  const mcRequired = mcRollup && mcRollup.totalJoints > 0;
  const mcCleared = mcRequired ? mcRollup.allCleared : true;

  const validation = useMemo(() => {
    if (mcRequired && !mcCleared) {
      return {
        ok: false,
        message: "Field Material Check must be cleared before erection.",
      };
    }
    if (!form?.w24FormNo.trim()) {
      return { ok: false, message: "Enter the W-24 QC form number." };
    }
    if (!placementLocation) {
      return { ok: false, message: "Select the placement location." };
    }
    if (!erectedBy) {
      return {
        ok: false,
        message: "Select the area supervisor who confirmed erection.",
      };
    }
    return { ok: true, message: "" };
  }, [form?.w24FormNo, placementLocation, erectedBy, mcRequired, mcCleared]);

  if (!spoolNo || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[560px]">
          <p className="mt-8 text-sm text-slate-500">
            Select a spool to view erection details.
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const isErected = !!storeRecord;

  const handleSubmit = async () => {
    if (!validation.ok || !erectedBy || !placementLocation) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) =>
      setTimeout(resolve, 600 + Math.random() * 200),
    );

    useErectedStore.getState().markErected({
      spoolNo,
      erectedBy,
      w24FormNo: form.w24FormNo.trim(),
      placementLocation,
      elevation: form.elevation?.trim() || undefined,
      remark: form.remark?.trim() || undefined,
    });

    setIsSubmitting(false);
    onOpenChange(false);

    toast.success(`${spoolNo} erected at ${placementLocation}`);

    useNotificationsStore.getState().pushNotification({
      severity: "success",
      category: "weld_progress",
      title: `${spoolNo}: erected at ${placementLocation}`,
      description: `W-24 ${form.w24FormNo.trim()} confirmed by ${erectedBy}`,
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
                stage === "Erected"
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              {stage}
            </span>
          </div>
          <SheetDescription>
            {isErected
              ? `Erected on ${storeRecord.erectedDate} at ${storeRecord.placementLocation}.`
              : "Confirm spool erection from the W-24 QC form once the area supervisor confirms placement in the designated location."}
          </SheetDescription>
        </SheetHeader>
        <PmWriteLockBanner />

        <div className="flex-1 space-y-5 overflow-auto py-4">
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

          {mcRequired && !mcCleared && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Field Material Check required</p>
              <p className="mt-0.5">
                Spool cannot be erected until field material check is signed
                off.
              </p>
            </div>
          )}

          {!isErected ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Placement location
                </Label>
                <Select
                  value={placementLocation || undefined}
                  onValueChange={(value) =>
                    setPlacementLocation(value as PlacementLocation)
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select location…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENT_LOCATIONS.map((location) => (
                      <SelectItem
                        key={location}
                        value={location}
                        className="text-xs"
                      >
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Elevation (optional)
                </Label>
                <Input
                  value={form.elevation ?? ""}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, elevation: event.target.value }
                        : current,
                    )
                  }
                  placeholder="EL +12.5"
                  className="font-mono text-xs"
                />
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
                  placeholder="W24-2025-0148"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  Area supervisor
                </Label>
                <Select
                  value={erectedBy || undefined}
                  onValueChange={(value) =>
                    setErectedBy(value as AreaSupervisor)
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
                  placeholder="Optional note about erection conditions or temporary supports."
                  className="min-h-24 text-xs"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3 rounded-md border bg-white p-4 text-sm">
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Placement location
                </span>
                <span className="text-slate-900">
                  {storeRecord.placementLocation}
                </span>
              </div>
              {storeRecord.elevation && (
                <div className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Elevation
                  </span>
                  <span className="font-mono text-slate-900">
                    {storeRecord.elevation}
                  </span>
                </div>
              )}
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
                  Erected date
                </span>
                <span className="text-slate-900">
                  {storeRecord.erectedDate}
                </span>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Area supervisor
                </span>
                <span className="text-slate-900">{storeRecord.erectedBy}</span>
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
          <W24PdfButton
            spoolNo={form.spoolNo}
            w24FormNo={form.w24FormNo}
            areaZone={form.placementLocation}
            erectedDate={storeRecord?.erectedDate}
          />
          {!isErected ? (
            <>
              <Button
                onClick={handleSubmit}
                disabled={!validation.ok || isSubmitting || pmLocked}
                className="w-full"
              >
                {isSubmitting ? "Marking…" : "Mark Erected"}
              </Button>
              {!validation.ok && (
                <p className="text-center text-xs text-slate-500">
                  {validation.message}
                </p>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-slate-500">
              Erected {storeRecord.erectedDate} by {storeRecord.erectedBy} at{" "}
              {storeRecord.placementLocation} via {storeRecord.w24FormNo}.
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
