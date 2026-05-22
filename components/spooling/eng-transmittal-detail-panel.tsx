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
import { toast } from "sonner";
import { useSpoolingStore, EngTransmittal } from "@/store/spooling-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  transmittal: EngTransmittal | null;
  open: boolean;
  onClose: () => void;
}

export function EngTransmittalDetailPanel({
  transmittal,
  open,
  onClose,
}: Props) {
  const [accepting, setAccepting] = useState(false);
  const acceptTransmittal = useSpoolingStore((s) => s.acceptTransmittal);
  const pushNotification = useNotificationsStore((s) => s.pushNotification);

  if (!transmittal) return null;

  async function handleAccept() {
    setAccepting(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));
    acceptTransmittal(transmittal!.id, "Sergey Lebedev");
    pushNotification({
      severity: "success",
      category: "system",
      title: `${transmittal!.id} accepted`,
      description: `${transmittal!.isoCount} ISOs received from ${transmittal!.sourceTeam} — ready for checkout`,
      href: "/spooling/iso-workflow",
    });
    toast.success(
      `${transmittal!.id} accepted — ${transmittal!.isoCount} ISOs created in workflow`,
    );
    setAccepting(false);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto px-2">
        <SheetHeader>
          <SheetTitle className="text-lg">{transmittal.id}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-2">
            <Badge
              className={
                transmittal.status === "Accepted"
                  ? "bg-emerald-100 text-emerald-800"
                  : transmittal.status === "Pending"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-sky-100 text-sky-800"
              }
            >
              {transmittal.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="text-slate-500">Source Team</div>
            <div className="font-medium">{transmittal.sourceTeam}</div>

            <div className="text-slate-500">Received Date</div>
            <div>{transmittal.receivedDate}</div>

            <div className="text-slate-500">ISO Count</div>
            <div className="font-medium">{transmittal.isoCount}</div>

            <div className="text-slate-500">New ISOs</div>
            <div className="text-emerald-700 font-medium">
              {transmittal.newCount}
            </div>

            <div className="text-slate-500">Revisions</div>
            <div className="text-amber-700 font-medium">
              {transmittal.revisionCount}
            </div>

            {transmittal.acceptedBy && (
              <>
                <div className="text-slate-500">Accepted By</div>
                <div>{transmittal.acceptedBy}</div>
                <div className="text-slate-500">Accepted Date</div>
                <div>{transmittal.acceptedDate}</div>
              </>
            )}
          </div>

          <Separator />

          {transmittal.status === "Pending" && (
            <div className="space-y-3">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Awaiting acceptance
                </div>
                Accepting will create {transmittal.isoCount} ISO records in the
                ISO Workflow queue.
              </div>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting
                  ? "Accepting..."
                  : `Accept ${transmittal.isoCount} ISOs`}
              </Button>
            </div>
          )}

          {transmittal.status === "Accepted" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Accepted by {transmittal.acceptedBy} on {transmittal.acceptedDate}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
