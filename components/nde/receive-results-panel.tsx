"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBatchesStore,
  useNotificationsStore,
  type NdeBatch,
  type NdeBatchWeld,
  type NdeWeldResult,
} from "@/store";
import { DefectCodeSelect } from "@/components/nde/defect-code-select";
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner";
import { REWORK_CODES } from "@/lib/engineering-references";
import { usePmWriteLock } from "@/lib/pm-write-lock";
import {
  formatNdeCleanNotificationDescription,
  formatNdeCleanNotificationTitle,
  formatNdeRejectNotificationDescription,
  formatNdeRejectNotificationTitle,
} from "@/lib/nde-notifications";
import { cn } from "@/lib/utils";

interface ReceiveResultsPanelProps {
  batch: NdeBatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

type WeldDecision = {
  result: NdeWeldResult;
  reworkCode?: string;
  defectCode?: string;
  defectLocation?: string;
  remarks?: string;
};

export function ReceiveResultsPanel({
  batch,
  open,
  onOpenChange,
  onSubmitted,
}: ReceiveResultsPanelProps) {
  const receiveResultsAction = useBatchesStore((s) => s.receiveResults);
  const pushNotification = useNotificationsStore((s) => s.pushNotification);
  const { locked: pmLocked } = usePmWriteLock();

  const [decisions, setDecisions] = useState<Record<string, WeldDecision>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const welds = batch?.welds ?? [];

  const getDecision = (weldId: string): WeldDecision => {
    return (
      decisions[weldId] ?? {
        result: "Accepted",
      }
    );
  };

  const updateDecision = (weldId: string, patch: Partial<WeldDecision>) => {
    setDecisions((prev) => ({
      ...prev,
      [weldId]: {
        ...getDecision(weldId),
        ...patch,
      },
    }));
  };

  const allWeldsDecided = welds.every((w) => getDecision(w.id).result);

  const rejectedCount = useMemo(
    () => welds.filter((w) => getDecision(w.id).result === "Rejected").length,
    [welds, decisions],
  );

  const canSubmit =
    !isSubmitting &&
    allWeldsDecided &&
    welds.every((w) => {
      const d = getDecision(w.id);
      if (d.result === "Rejected") {
        return !!d.reworkCode && !!d.defectCode && !!d.defectLocation?.trim();
      }
      return true;
    });

  const handleSubmit = async () => {
    if (!batch || !canSubmit) return;

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

    const results = welds.map((w) => {
      const d = getDecision(w.id);
      const codeEntry = REWORK_CODES.find((c) => c.code === d.reworkCode);
      return {
        weldId: w.id,
        result: d.result,
        reworkCode: d.result === "Rejected" ? d.reworkCode : undefined,
        defectCode: d.result === "Rejected" ? d.defectCode : undefined,
        defectLocation: d.result === "Rejected" ? d.defectLocation : undefined,
        remarks:
          d.result === "Rejected"
            ? d.remarks || codeEntry?.description || "Rejected during NDE"
            : undefined,
        inspector: batch.welds.find((bw) => bw.id === w.id)?.inspector,
      };
    });

    receiveResultsAction(batch.id, results);

    const rejectedWelds = welds.filter(
      (w) => getDecision(w.id).result === "Rejected",
    );

    if (rejectedCount > 0) {
      const rejectTitle = formatNdeRejectNotificationTitle(
        batch.batchNo,
        rejectedCount,
        rejectedWelds,
      );
      pushNotification({
        severity: "warning",
        category: "nde_result",
        title: rejectTitle,
        description: formatNdeRejectNotificationDescription(rejectedWelds),
        href: "/nde",
        actorLabel: batch.subcontractor,
      });
      toast.warning(rejectTitle);
    } else {
      const cleanTitle = formatNdeCleanNotificationTitle(batch.batchNo);
      pushNotification({
        severity: "success",
        category: "nde_result",
        title: cleanTitle,
        description: formatNdeCleanNotificationDescription(
          welds.length,
          batch.subcontractor,
        ),
        href: "/nde",
        actorLabel: batch.subcontractor,
      });
      toast.success(cleanTitle);
    }

    setIsSubmitting(false);
    setDecisions({});
    onOpenChange(false);
    onSubmitted?.();
  };

  const resultBadgeClasses = {
    Pending: "border-slate-300 bg-slate-100 text-slate-700",
    Accepted: "border-emerald-300 bg-emerald-100 text-emerald-800",
    Rejected: "border-red-300 bg-red-100 text-red-800",
  } as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[640px]">
        {batch ? (
          <>
            <SheetHeader className="gap-3 border-b px-6 py-5">
              <PmWriteLockBanner />
              <div className="space-y-2">
                <SheetTitle className="font-mono text-xl tracking-tight text-slate-900">
                  Receive Results
                </SheetTitle>
                <SheetDescription>
                  {batch.batchNo} • {batch.method} • {batch.welds.length} weld
                  {batch.welds.length === 1 ? "" : "s"}
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">Joint</TableHead>
                      <TableHead className="text-xs">Result</TableHead>
                      <TableHead className="text-xs">Rework code</TableHead>
                      <TableHead className="text-xs">Defect code</TableHead>
                      <TableHead className="text-xs">Location of defect</TableHead>
                      <TableHead className="text-xs">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {welds.map((w) => {
                      const d = getDecision(w.id);
                      const isRejected = d.result === "Rejected";
                      return (
                        <TableRow key={w.id}>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-xs font-medium">
                                {w.jointNo}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {w.spoolNo}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <RadioGroup
                              value={d.result}
                              onValueChange={(val) =>
                                updateDecision(w.id, {
                                  result: val as NdeWeldResult,
                                  reworkCode:
                                    val === "Rejected"
                                      ? d.reworkCode
                                      : undefined,
                                })
                              }
                              className="flex flex-col gap-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="Accepted"
                                  id={`${w.id}-accept`}
                                  className="size-3.5"
                                />
                                <Label
                                  htmlFor={`${w.id}-accept`}
                                  className={cn(
                                    "text-[11px] font-medium cursor-pointer",
                                    d.result === "Accepted" &&
                                      "text-emerald-700",
                                  )}
                                >
                                  Accept
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="Rejected"
                                  id={`${w.id}-reject`}
                                  className="size-3.5"
                                />
                                <Label
                                  htmlFor={`${w.id}-reject`}
                                  className={cn(
                                    "text-[11px] font-medium cursor-pointer",
                                    d.result === "Rejected" && "text-red-700",
                                  )}
                                >
                                  Reject
                                </Label>
                              </div>
                            </RadioGroup>
                          </TableCell>
                          <TableCell>
                            {isRejected ? (
                              <Select
                                value={d.reworkCode ?? ""}
                                onValueChange={(val) =>
                                  updateDecision(w.id, { reworkCode: val })
                                }
                              >
                                <SelectTrigger className="h-7 text-xs w-[140px]">
                                  <SelectValue placeholder="Pick code" />
                                </SelectTrigger>
                                <SelectContent>
                                  {REWORK_CODES.map((rc) => (
                                    <SelectItem
                                      key={rc.code}
                                      value={rc.code}
                                      className="text-xs"
                                    >
                                      {rc.code} — {rc.shortName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isRejected ? (
                              <DefectCodeSelect
                                value={d.defectCode}
                                onValueChange={(val) =>
                                  updateDecision(w.id, { defectCode: val })
                                }
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isRejected ? (
                              <Input
                                placeholder="root pass, 3 o'clock…"
                                value={d.defectLocation ?? ""}
                                onChange={(e) =>
                                  updateDecision(w.id, {
                                    defectLocation: e.target.value,
                                  })
                                }
                                className="h-7 text-xs w-[180px]"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isRejected ? (
                              <Input
                                placeholder="Optional remarks"
                                value={d.remarks ?? ""}
                                onChange={(e) =>
                                  updateDecision(w.id, {
                                    remarks: e.target.value,
                                  })
                                }
                                className="h-7 text-xs"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {rejectedCount > 0 && (
                <div className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {rejectedCount} weld{rejectedCount === 1 ? "" : "s"} marked
                  for rejection. Rework will be cascaded to fabrication on
                  submit.
                </div>
              )}
            </div>

            <SheetFooter className="border-t px-6 py-4">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {welds.length - Object.keys(decisions).length} undecided
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDecisions({});
                      onOpenChange(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!canSubmit || pmLocked}
                    onClick={handleSubmit}
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : `Submit results (${rejectedCount > 0 ? `${rejectedCount} rejected` : "all accepted"})`}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
