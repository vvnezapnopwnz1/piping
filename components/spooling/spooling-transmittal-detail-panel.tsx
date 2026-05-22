"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useSpoolingStore, SpoolingTransmittal } from "@/store/spooling-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { Send } from "lucide-react";

const RELEASERS = ["Sergey Lebedev", "Vlad Morozov"];

interface ComposeModeProps {
  onClose: () => void;
}

function ComposeMode({ onClose }: ComposeModeProps) {
  const [loading, setLoading] = useState(false);
  const [targetArea, setTargetArea] = useState("");
  const [selectedIsos, setSelectedIsos] = useState<string[]>([]);
  const [releasedBy, setReleasedBy] = useState("");
  const isoRecords = useSpoolingStore((s) => s.isoRecords);
  const composeAndSend = useSpoolingStore((s) => s.composeAndSendTransmittal);
  const pushNotification = useNotificationsStore((s) => s.pushNotification);

  const releasedISOs = isoRecords.filter((iso) => iso.status === "Released");

  function toggleISO(id: string) {
    setSelectedIsos((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  async function handleSend() {
    if (!targetArea || !releasedBy || selectedIsos.length === 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 200));
    composeAndSend(targetArea, selectedIsos, releasedBy);
    pushNotification({
      severity: "success",
      category: "system",
      title: "Spooling Transmittal sent",
      description: `${selectedIsos.length} ISO(s) dispatched to Fabrication — area ${targetArea}`,
      href: "/spooling/spooling-transmittal",
    });
    toast.success(
      `Transmittal sent — ${selectedIsos.length} ISO(s) → Fabrication`,
    );
    setLoading(false);
    onClose();
  }

  return (
    <div className="space-y-4">
      {releasedISOs.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No Released ISOs available. Release ISOs in ISO Workflow first.
        </div>
      )}

      <div className="space-y-2">
        <Label>Target PDS Area</Label>
        <Select value={targetArea} onValueChange={setTargetArea}>
          <SelectTrigger>
            <SelectValue placeholder="Select area..." />
          </SelectTrigger>
          <SelectContent>
            {Array.from(new Set(releasedISOs.map((i) => i.pdsArea))).map(
              (area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Released By</Label>
        <Select value={releasedBy} onValueChange={setReleasedBy}>
          <SelectTrigger>
            <SelectValue placeholder="Select releaser..." />
          </SelectTrigger>
          <SelectContent>
            {RELEASERS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">
          Select ISOs ({selectedIsos.length} selected)
        </Label>
        <div className="rounded-md border divide-y max-h-60 overflow-y-auto">
          {releasedISOs.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No released ISOs</div>
          ) : (
            releasedISOs.map((iso) => (
              <div
                key={iso.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50"
              >
                <Checkbox
                  checked={selectedIsos.includes(iso.id)}
                  onCheckedChange={() => toggleISO(iso.id)}
                  id={`iso-${iso.id}`}
                />
                <label
                  htmlFor={`iso-${iso.id}`}
                  className="text-sm font-mono cursor-pointer flex-1"
                >
                  {iso.id}
                </label>
                <span className="text-xs text-slate-500">{iso.pdsArea}</span>
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  Released
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>

      <Button
        className="w-full"
        onClick={handleSend}
        disabled={
          !targetArea || !releasedBy || selectedIsos.length === 0 || loading
        }
      >
        <Send className="h-4 w-4 mr-2" />
        {loading
          ? "Sending..."
          : `Send ${selectedIsos.length} ISO(s) to Fabrication`}
      </Button>
    </div>
  );
}

interface ViewModeProps {
  transmittal: SpoolingTransmittal;
}

function ViewMode({ transmittal }: ViewModeProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge
          className={
            transmittal.status === "Sent"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }
        >
          {transmittal.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="text-slate-500">Generated</div>
        <div>{transmittal.generatedDate}</div>
        <div className="text-slate-500">Target Area</div>
        <div className="font-medium">{transmittal.targetArea}</div>
        <div className="text-slate-500">ISO Count</div>
        <div className="font-medium">{transmittal.isoCount}</div>
        <div className="text-slate-500">Released By</div>
        <div>{transmittal.releasedBy}</div>
        {transmittal.sentDate && (
          <>
            <div className="text-slate-500">Sent Date</div>
            <div>{transmittal.sentDate}</div>
          </>
        )}
      </div>
      <Separator />
      <div className="space-y-1">
        <div className="text-sm font-medium">ISOs in Batch</div>
        {transmittal.isoIds.map((id) => (
          <div key={id} className="font-mono text-sm text-slate-700">
            {id}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  transmittal: SpoolingTransmittal | null;
  mode: "view" | "compose";
  open: boolean;
  onClose: () => void;
}

export function SpoolingTransmittalDetailPanel({
  transmittal,
  mode,
  open,
  onClose,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto px-2">
        <SheetHeader>
          <SheetTitle>
            {mode === "compose"
              ? "Compose Outbound Transmittal"
              : (transmittal?.id ?? "Transmittal")}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {mode === "compose" ? (
            <ComposeMode onClose={onClose} />
          ) : transmittal ? (
            <ViewMode transmittal={transmittal} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
