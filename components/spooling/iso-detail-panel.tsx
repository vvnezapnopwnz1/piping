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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSpoolingStore, ISORecord } from "@/store/spooling-store";
import { useNotificationsStore } from "@/store/notifications-store";
import {
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";

const SPOOLERS = ["Masha Ivanova", "Dmitry Petrov", "Anna Sokolova"];
const CHECKERS = ["Vlad Morozov", "Sergey Lebedev"];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Received":
      return "bg-amber-100 text-amber-800";
    case "Checked Out":
      return "bg-sky-100 text-sky-800";
    case "In Checking":
      return "bg-violet-100 text-violet-800";
    case "Released":
      return "bg-emerald-100 text-emerald-800";
    case "On Hold":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

interface Props {
  iso: ISORecord | null;
  open: boolean;
  onClose: () => void;
}

export function IsoDetailPanel({ iso, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [spooler, setSpooler] = useState("");
  const [checker, setChecker] = useState("");
  const [checkComment, setCheckComment] = useState("");
  const [holdType, setHoldType] = useState<"Spool Team" | "Engineering">(
    "Spool Team",
  );
  const [holdHolder, setHoldHolder] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [releaseReason, setReleaseReason] = useState("");
  const [showHoldForm, setShowHoldForm] = useState(false);

  const store = useSpoolingStore();
  const pushNotification = useNotificationsStore((s) => s.pushNotification);

  if (!iso) return null;

  async function runAction(
    action: () => void,
    successMsg: string,
    notif?: {
      title: string;
      description: string;
      severity: "success" | "warning" | "error" | "info";
    },
  ) {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));
    action();
    if (notif) {
      pushNotification({
        ...notif,
        category: "system",
        href: "/spooling/iso-workflow",
      });
    }
    toast.success(successMsg);
    setLoading(false);
    onClose();
  }

  function handleCheckout() {
    if (!spooler) return;
    runAction(
      () => store.checkoutISO(iso!.id, spooler),
      `${iso!.id} checked out to ${spooler}`,
      {
        title: `${iso!.id} checked out`,
        description: `Assigned to ${spooler} for spooling in SpoolGen`,
        severity: "info",
      },
    );
  }

  function handleCheckIn() {
    runAction(
      () => store.checkInISO(iso!.id),
      `${iso!.id} submitted for checking`,
      {
        title: `${iso!.id} ready for check`,
        description: `${iso!.spooledBy} submitted for verification — assign a checker`,
        severity: "info",
      },
    );
  }

  function handleApprove(withRemark = false) {
    if (!checker) return;
    runAction(
      () => store.approveISO(iso!.id, checker, checkComment, withRemark),
      `${iso!.id} ${withRemark ? "approved with remark" : "approved"} — Round ${iso!.totalRounds + 1}`,
      {
        title: `${iso!.id} released`,
        description: `Approved by ${checker} after ${iso!.totalRounds + 1} round(s) — ready for Spooling Transmittal`,
        severity: "success",
      },
    );
  }

  function handleReject() {
    if (!checker || !checkComment.trim()) return;
    runAction(
      () => store.rejectISO(iso!.id, checker, checkComment),
      `${iso!.id} rejected — Round ${iso!.totalRounds + 1} — returned to ${iso!.spooledBy}`,
      {
        title: `${iso!.id} check failed`,
        description: `Rejected by ${checker} — Round ${iso!.totalRounds + 1}. ${iso!.spooledBy} must rework.`,
        severity: "warning",
      },
    );
  }

  function handleApplyHold() {
    if (!holdHolder || !holdReason.trim()) return;
    runAction(
      () =>
        store.applyHold(iso!.id, {
          holdType,
          holderName: holdHolder,
          reason: holdReason,
        }),
      `Hold applied to ${iso!.id}`,
      {
        title: `${iso!.id} on hold`,
        description: `${holdType} hold applied by ${holdHolder}: ${holdReason}`,
        severity: "warning",
      },
    );
  }

  function handleReleaseHold() {
    if (!releaseReason.trim()) return;
    runAction(
      () => store.releaseHold(iso!.id, releaseReason),
      `Hold released for ${iso!.id} — back to Received`,
      {
        title: `${iso!.id} hold released`,
        description: `Returned to workflow: ${releaseReason}`,
        severity: "success",
      },
    );
  }

  const canApplyHold = ["Received", "Checked Out", "In Checking"].includes(
    iso.status,
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[520px] sm:w-[580px] overflow-y-auto px-2">
        <SheetHeader>
          <SheetTitle className="font-mono text-lg">{iso.id}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={statusBadgeClass(iso.status)}>{iso.status}</Badge>
            <span className="text-sm text-slate-500">Rev {iso.rev}</span>
            <span className="text-sm text-slate-500">PDS: {iso.pdsArea}</span>
            <span className="text-sm text-slate-500">{iso.serviceClass}</span>
            {iso.totalRounds > 0 && (
              <Badge variant="outline" className="text-xs">
                {iso.totalRounds} round{iso.totalRounds !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {iso.totalRounds >= 4 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {iso.totalRounds} checking rounds — consider escalating to
              Spooling Team lead
            </div>
          )}

          <Separator />

          {iso.status === "Received" && !showHoldForm && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Checkout to Spooler</div>
              <div className="space-y-2">
                <Label className="text-sm">Assign to</Label>
                <Select value={spooler} onValueChange={setSpooler}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select spooler..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPOOLERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={!spooler || loading}
              >
                {loading ? "Checking out..." : "Checkout ISO"}
              </Button>
            </div>
          )}

          {iso.status === "Checked Out" && !showHoldForm && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-sky-800">
                Assigned to: {iso.spooledBy}
              </div>
              <div className="text-sm text-slate-500">
                Checkout date: {iso.checkoutDate}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCheckIn}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit for Checking"}
              </Button>
            </div>
          )}

          {iso.status === "In Checking" && !showHoldForm && (
            <div className="space-y-3">
              <div className="text-sm font-medium">
                Review ISO — Round {iso.totalRounds + 1}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Checker</Label>
                <Select value={checker} onValueChange={setChecker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select checker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CHECKERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Comment (required for reject)</Label>
                <Textarea
                  placeholder="Checking notes or rejection reason..."
                  value={checkComment}
                  onChange={(e) => setCheckComment(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleApprove(false)}
                  disabled={!checker || loading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-emerald-300 text-emerald-700"
                  onClick={() => handleApprove(true)}
                  disabled={!checker || !checkComment.trim() || loading}
                >
                  Approve w/ Remark
                </Button>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleReject}
                disabled={!checker || !checkComment.trim() || loading}
              >
                <XCircle className="h-4 w-4 mr-1" /> Reject — Return to Spooler
              </Button>
            </div>
          )}

          {iso.status === "Released" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Released {iso.releasedDate} — ready for Spooling Transmittal
            </div>
          )}

          {canApplyHold && !showHoldForm && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700"
              onClick={() => setShowHoldForm(true)}
            >
              <PauseCircle className="h-4 w-4 mr-1" /> Apply Hold
            </Button>
          )}

          {showHoldForm && (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="text-sm font-medium text-red-900">Apply Hold</div>
              <div className="space-y-2">
                <Label className="text-sm">Hold Type</Label>
                <Select
                  value={holdType}
                  onValueChange={(v) =>
                    setHoldType(v as "Spool Team" | "Engineering")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spool Team">Spool Team Hold</SelectItem>
                    <SelectItem value="Engineering">
                      Engineering Hold
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Holder Name</Label>
                <Input
                  value={holdHolder}
                  onChange={(e) => setHoldHolder(e.target.value)}
                  placeholder="Responsible person"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Reason</Label>
                <Textarea
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Explain why ISO is being held..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleApplyHold}
                  disabled={!holdHolder || !holdReason.trim() || loading}
                >
                  {loading ? "Applying..." : "Apply Hold"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHoldForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {iso.status === "On Hold" && iso.activeHold && (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="text-sm font-medium text-red-900">
                Active Hold
              </div>
              <div className="text-sm text-red-800">
                <span className="font-medium">{iso.activeHold.holdType}</span> —{" "}
                {iso.activeHold.reason}
              </div>
              <div className="text-xs text-red-600">
                Holder: {iso.activeHold.holderName} ·{" "}
                {iso.activeHold.appliedDate}
              </div>
              <Separator className="bg-red-200" />
              <div className="space-y-2">
                <Label className="text-sm">Release Reason</Label>
                <Textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="Explain why hold is being released..."
                  rows={2}
                />
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleReleaseHold}
                disabled={!releaseReason.trim() || loading}
              >
                <PlayCircle className="h-4 w-4 mr-1" />{" "}
                {loading ? "Releasing..." : "Release Hold"}
              </Button>
            </div>
          )}

          {iso.checkingRounds.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">
                  Checking History
                </div>
                {iso.checkingRounds.map((round) => (
                  <div
                    key={round.round}
                    className="rounded-md border border-slate-200 p-3 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        Round {round.round}
                      </span>
                      <Badge
                        className={
                          round.decision === "Approved"
                            ? "bg-emerald-100 text-emerald-800 text-xs"
                            : round.decision === "Approved with remark"
                              ? "bg-sky-100 text-sky-800 text-xs"
                              : "bg-red-100 text-red-800 text-xs"
                        }
                      >
                        {round.decision}
                      </Badge>
                      <span className="text-xs text-slate-400 ml-auto">
                        {round.date}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {round.checkerName}
                    </div>
                    {round.comment && (
                      <div className="text-sm text-slate-700 mt-1 italic">
                        &quot;{round.comment}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {iso.holdHistory.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">
                  Hold History
                </div>
                {iso.holdHistory.map((h, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-slate-200 p-3 space-y-1 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        {h.holdType}
                      </Badge>
                      {h.releasedDate && (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                          Released
                        </Badge>
                      )}
                    </div>
                    <div className="text-slate-600">{h.reason}</div>
                    <div className="text-xs text-slate-400">
                      {h.holderName} · Applied {h.appliedDate}
                      {h.releasedDate && ` · Released ${h.releasedDate}`}
                    </div>
                    {h.releaseReason && (
                      <div className="text-xs text-slate-500 italic">
                        Release: {h.releaseReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
