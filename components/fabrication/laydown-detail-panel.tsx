"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  useLaydownStore,
  useNotificationsStore,
  useSpoolStages,
} from "@/store";
import {
  YARD_LOCATIONS,
  QC_INSPECTORS,
  STAGE_COLOR,
  type LaydownRecord,
  type YardLocation,
} from "@/lib/spool-data";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
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

interface LaydownDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildEmptyRecord(spoolNo: string): LaydownRecord {
  return {
    spoolNo,
    yardLocation: "YARD-A-01",
    placedDate: "",
    placedBy: "",
  };
}

export function LaydownDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: LaydownDetailPanelProps) {
  const router = useRouter();
  const storeRecord = useLaydownStore((s) =>
    spoolNo ? s.getRecord(spoolNo) : undefined,
  );
  const stages = useSpoolStages();
  const stage = spoolNo
    ? (stages.get(spoolNo) ?? "Not Started")
    : "Not Started";

  const [form, setForm] = useState<LaydownRecord | null>(null);
  const [yardLocation, setYardLocation] = useState<YardLocation | "">("");
  const [placedBy, setPlacedBy] = useState<string>(QC_INSPECTORS[0]);
  const [releasedBy, setReleasedBy] = useState<string>(QC_INSPECTORS[0]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  useEffect(() => {
    if (storeRecord) {
      setForm(JSON.parse(JSON.stringify(storeRecord)));
      setYardLocation(storeRecord.yardLocation ?? "");
      setPlacedBy(storeRecord.placedBy ?? QC_INSPECTORS[0]);
      setReleasedBy(storeRecord.releasedBy ?? QC_INSPECTORS[0]);
    } else if (spoolNo) {
      setForm(buildEmptyRecord(spoolNo));
      setYardLocation("");
      setPlacedBy(QC_INSPECTORS[0]);
      setReleasedBy(QC_INSPECTORS[0]);
    } else {
      setForm(null);
    }
  }, [storeRecord, spoolNo]);

  const colors = STAGE_COLOR[stage];

  const placeValidation = useMemo(() => {
    if (!yardLocation || !placedBy) {
      return { ok: false, message: "Pick a yard location and a placer." };
    }
    return { ok: true, message: "" };
  }, [yardLocation, placedBy]);

  const releaseValidation = useMemo(() => {
    if (!releasedBy) {
      return { ok: false, message: "Pick the releaser." };
    }
    return { ok: true, message: "" };
  }, [releasedBy]);

  if (!spoolNo || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[560px]">
          <p className="text-sm text-slate-500 mt-8">
            Select a spool to view details
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const isPlaced = !!form.placedDate;
  const isReleased = !!form.releasedToSiteDate;

  const handlePlace = async () => {
    if (!placeValidation.ok || !yardLocation || !placedBy) return;
    setIsPlacing(true);
    await new Promise((r) => setTimeout(r, 700));

    useLaydownStore.getState().placeOnYard({
      spoolNo: form.spoolNo,
      yardLocation,
      placedBy,
    });

    setIsPlacing(false);
    onOpenChange(false);

    toast.success(`${form.spoolNo} placed at ${yardLocation}`);

    const pushNotification = useNotificationsStore.getState().pushNotification;
    pushNotification({
      severity: "info",
      category: "weld_progress",
      title: `${form.spoolNo}: placed in laydown yard`,
      description: `Location ${yardLocation} (${placedBy})`,
      href: "/fabrication/laydown",
    });

    router.replace("/fabrication/laydown?status=InYard");
  };

  const handleRelease = async () => {
    if (!releaseValidation.ok || !releasedBy) return;
    setIsReleasing(true);
    await new Promise((r) => setTimeout(r, 700));

    useLaydownStore.getState().releaseToSite({
      spoolNo: form.spoolNo,
      releasedBy,
    });

    setIsReleasing(false);
    onOpenChange(false);

    toast.success(`${form.spoolNo} released to site`);

    const pushNotification = useNotificationsStore.getState().pushNotification;
    pushNotification({
      severity: "info",
      category: "weld_progress",
      title: `${form.spoolNo}: released to site`,
      description: `Cleared by ${releasedBy} — ready for erection`,
      href: "/erection/dashboard",
    });

    router.replace("/fabrication/laydown?status=Released");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[560px] flex flex-col overflow-hidden">
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
            {isReleased
              ? `Released on ${form.releasedToSiteDate} — handed to Erection`
              : isPlaced
                ? `Placed on ${form.placedDate} at ${form.yardLocation} — awaiting release`
                : "Awaiting yard placement"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-auto py-4 space-y-5">
          {isPlaced && (
            <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700">
              Placed {form.placedDate} at {form.yardLocation} by {form.placedBy}
            </div>
          )}

          {!isPlaced && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Yard location
              </Label>
              <Select
                value={yardLocation || "__empty__"}
                onValueChange={(v) => setYardLocation(v as YardLocation)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select yard location…" />
                </SelectTrigger>
                <SelectContent>
                  {YARD_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc} className="text-xs">
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isPlaced && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Placed by
              </Label>
              <Select
                value={placedBy}
                onValueChange={(v) => setPlacedBy(v)}
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
          )}

          {isPlaced && !isReleased && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Released by
              </Label>
              <Select
                value={releasedBy}
                onValueChange={(v) => setReleasedBy(v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select releaser…" />
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
          )}
        </div>

        <SheetFooter className="shrink-0 pt-4 border-t flex-col items-stretch gap-2">
          {!isPlaced && (
            <>
              <Button
                onClick={handlePlace}
                disabled={!placeValidation.ok || isPlacing}
                className="w-full"
              >
                {isPlacing ? "Placing…" : "Place on yard"}
              </Button>
              {!placeValidation.ok && (
                <p className="text-xs text-slate-500 text-center">
                  {placeValidation.message}
                </p>
              )}
            </>
          )}

          {isPlaced && !isReleased && (
            <>
              <Button
                onClick={handleRelease}
                disabled={!releaseValidation.ok || isReleasing}
                className="w-full"
              >
                {isReleasing ? "Releasing…" : "Release to site"}
              </Button>
              {!releaseValidation.ok && (
                <p className="text-xs text-slate-500 text-center">
                  {releaseValidation.message}
                </p>
              )}
            </>
          )}

          {isReleased && (
            <p className="text-sm text-slate-500 text-center">
              Released {form.releasedToSiteDate} by {form.releasedBy} from {form.yardLocation} — handed to Erection
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
