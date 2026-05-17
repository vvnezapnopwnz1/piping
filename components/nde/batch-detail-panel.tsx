"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiveResultsPanel } from "@/components/nde/receive-results-panel";
import {
  useBatchesStore,
  useWeldsStore,
  type NdeBatch,
  type NdeBatchHistoryEvent,
  type NdeBatchStatus,
  type NdeBatchWeld,
} from "@/store";
import { cn } from "@/lib/utils";
import {
  hasNde100Requirement,
  mapBatchStatusToManual,
  mapResultToJointCode,
} from "@/lib/nde-status";

interface BatchDetailPanelProps {
  batch: NdeBatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusClasses: Record<NdeBatchStatus, string> = {
  Created: "border-slate-300 bg-slate-100 text-slate-700",
  Issued: "border-sky-300 bg-sky-100 text-sky-800",
  "In Progress": "border-amber-300 bg-amber-100 text-amber-800",
  "Results Received": "border-violet-300 bg-violet-100 text-violet-800",
  Closed: "border-emerald-300 bg-emerald-100 text-emerald-800",
  Rework: "border-red-300 bg-red-100 text-red-800",
};

const resultClasses = {
  Pending: "border-slate-300 bg-slate-100 text-slate-700",
  Accepted: "border-emerald-300 bg-emerald-100 text-emerald-800",
  Rejected: "border-red-300 bg-red-100 text-red-800",
} as const;

function StatusPill({ status }: { status: NdeBatchStatus }) {
  const manual = mapBatchStatusToManual(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        statusClasses[status],
      )}
    >
      {manual}
    </span>
  );
}

function ResultBadge({ result }: { result: NdeBatchWeld["result"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        resultClasses[result],
      )}
    >
      {result}
    </span>
  );
}

function HistoryItem({ event }: { event: NdeBatchHistoryEvent }) {
  const initials = event.actor
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <Avatar className="size-8 border border-slate-200 bg-slate-100">
          <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-700">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="mt-2 h-full w-px bg-slate-200 last:hidden" />
      </div>
      <div className="flex-1 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-900">{event.title}</p>
          <StatusPill status={event.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{event.actor}</span>
          <span>{format(new Date(event.timestamp), "dd MMM yyyy")}</span>
        </div>
      </div>
    </div>
  );
}

export function BatchDetailPanel({
  batch,
  open,
  onOpenChange,
}: BatchDetailPanelProps) {
  const [expandedWelds, setExpandedWelds] = useState<string[]>([]);
  const [confirmReworkOpen, setConfirmReworkOpen] = useState(false);
  const [receivePanelOpen, setReceivePanelOpen] = useState(false);

  const issueBatch = useBatchesStore((s) => s.issueBatch);
  const markForReworkBatch = useBatchesStore((s) => s.markForRework);
  const closeBatchAction = useBatchesStore((s) => s.closeBatch);

  useEffect(() => {
    setExpandedWelds([]);
    setConfirmReworkOpen(false);
  }, [batch?.id]);

  const acceptedCount = batch
    ? batch.welds.filter((w) => w.result === "Accepted").length
    : 0;
  const rejectedCount = batch
    ? batch.welds.filter((w) => w.result === "Rejected").length
    : 0;

  const acceptanceRate = useMemo(() => {
    if (!batch || batch.welds.length === 0) {
      return 0;
    }
    return Math.round((acceptedCount / batch.welds.length) * 1000) / 10;
  }, [batch, acceptedCount]);

  const daysSinceIssue = useMemo(() => {
    if (!batch?.issuedDate) {
      return "—";
    }
    return `${differenceInCalendarDays(new Date(), new Date(batch.issuedDate))} days`;
  }, [batch]);

  const closable = batch
    ? batch.status !== "Closed" &&
      batch.welds.every((w) => w.result === "Accepted")
    : false;

  const toggleWeldExpansion = (weldId: string) => {
    setExpandedWelds((current) =>
      current.includes(weldId)
        ? current.filter((id) => id !== weldId)
        : [...current, weldId],
    );
  };

  const handleSend = async () => {
    if (!batch) return;
    await new Promise((r) => setTimeout(r, 600));
    issueBatch(batch.id, "Bureau Veritas", "NDE-INS-04");
    toast.success(`Batch ${batch.batchNo} issued to Bureau Veritas`);
  };

  const handleReceiveResults = () => {
    if (!batch) return;
    setReceivePanelOpen(true);
  };

  const handleConfirmRework = async () => {
    if (!batch) return;
    await new Promise((r) => setTimeout(r, 500));
    markForReworkBatch(batch.id);

    // Domino effect: update welds-store for each rejected weld
    const updateWeld = useWeldsStore.getState().markForRework;
    batch.welds
      .filter((w) => w.result === "Rejected")
      .forEach((w) =>
        updateWeld(w.id, w.remarks || "Marked for rework from NDE batch"),
      );

    toast.success(`${batch.batchNo} dispatched for rework`);
    setConfirmReworkOpen(false);
  };

  const tracerSelections = batch?.tracerSelections ?? [];
  const nde100Required = batch
    ? hasNde100Requirement(batch, tracerSelections)
    : false;

  const handleCloseBatch = () => {
    if (!batch) return;
    closeBatchAction(batch.id);
    toast.success(`Batch ${batch.batchNo} closed`);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-[640px]"
        >
          {batch ? (
            <>
              <SheetHeader className="gap-3 border-b px-6 py-5">
                <div className="flex items-start justify-between gap-4 pr-10">
                  <div className="space-y-2">
                    <SheetTitle className="font-mono text-2xl tracking-tight text-slate-900">
                      {batch.batchNo}
                    </SheetTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={batch.status} />
                      <SheetDescription>
                        {batch.method} examination package •{" "}
                        {batch.subcontractor}
                      </SheetDescription>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <Tabs defaultValue="overview" className="gap-4">
                  <TabsList className="h-9">
                    <TabsTrigger value="overview" className="text-xs">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="welds" className="text-xs">
                      Welds
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">
                      History
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {nde100Required ? (
                      <Card className="border-red-300 bg-red-50">
                        <CardContent className="p-4 text-sm text-red-800">
                          NDE 100 required for this welder group (4+ rejected
                          weld points / tracers).
                        </CardContent>
                      </Card>
                    ) : null}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Card className="gap-4 py-5">
                        <CardHeader className="px-5 pb-0">
                          <CardTitle className="text-sm font-medium">
                            General
                          </CardTitle>
                          <CardDescription>
                            Batch control metadata
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-5">
                          <dl className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">Method</dt>
                              <dd className="font-medium text-slate-900">
                                {batch.method}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">
                                NDE matrix
                              </dt>
                              <dd className="font-medium text-slate-900">
                                {batch.matrixRef}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">
                                Subcontractor
                              </dt>
                              <dd className="font-medium text-slate-900">
                                {batch.subcontractor}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">Created</dt>
                              <dd className="font-medium text-slate-900">
                                {format(
                                  new Date(batch.createdDate),
                                  "dd MMM yyyy",
                                )}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">Issued</dt>
                              <dd className="font-medium text-slate-900">
                                {batch.issuedDate
                                  ? format(
                                      new Date(batch.issuedDate),
                                      "dd MMM yyyy",
                                    )
                                  : "—"}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">Closed</dt>
                              <dd className="font-medium text-slate-900">
                                {batch.closedDate
                                  ? format(
                                      new Date(batch.closedDate),
                                      "dd MMM yyyy",
                                    )
                                  : "—"}
                              </dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>

                      <Card className="gap-4 py-5">
                        <CardHeader className="px-5 pb-0">
                          <CardTitle className="text-sm font-medium">
                            Performance
                          </CardTitle>
                          <CardDescription>
                            Current batch outcome snapshot
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-5">
                          <dl className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">
                                Total welds
                              </dt>
                              <dd className="font-medium text-slate-900">
                                {batch.welds.length}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">
                                Accepted
                              </dt>
                              <dd className="font-medium text-emerald-700">
                                {acceptedCount}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">
                                Rejected
                              </dt>
                              <dd className="font-medium text-red-700">
                                {rejectedCount}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">
                                Acceptance rate
                              </dt>
                              <dd className="font-medium text-slate-900">
                                {acceptanceRate}%
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">
                                Days since issue
                              </dt>
                              <dd className="font-medium text-slate-900">
                                {daysSinceIssue}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt className="text-muted-foreground">
                                Results received
                              </dt>
                              <dd className="font-medium text-slate-900">
                                {batch.resultsReceivedDate
                                  ? format(
                                      new Date(batch.resultsReceivedDate),
                                      "dd MMM yyyy",
                                    )
                                  : "Pending"}
                              </dd>
                            </div>
                          </dl>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="gap-4 py-5">
                      <CardHeader className="px-5 pb-0">
                        <CardTitle className="text-sm font-medium">
                          Batch health
                        </CardTitle>
                        <CardDescription>
                          Control points before close-out
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 px-5 sm:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                            <Clock className="h-4 w-4 text-sky-600" />
                            Turnaround
                          </div>
                          <p className="mt-2 text-2xl font-semibold text-slate-900">
                            {daysSinceIssue}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            From issue date to current status
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Accepted
                          </div>
                          <p className="mt-2 text-2xl font-semibold text-slate-900">
                            {acceptedCount}/{batch.welds.length}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Fit for final dossier issue
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            Rework exposure
                          </div>
                          <p className="mt-2 text-2xl font-semibold text-slate-900">
                            {rejectedCount}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Welds requiring repair and re-exam
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="welds" className="space-y-4">
                    <Card className="gap-4 py-5">
                      <CardHeader className="px-5 pb-0">
                        <CardTitle className="text-sm font-medium">
                          Weld register
                        </CardTitle>
                        <CardDescription>
                          Click any weld row to inspect the full NDE record
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="px-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Joint No
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Spool
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                ISO
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Welder
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Code
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Result
                              </TableHead>
                              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Rework Code
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batch.welds.map((weld) => {
                              const isExpanded = expandedWelds.includes(
                                weld.id,
                              );

                              return (
                                <Fragment key={weld.id}>
                                  <TableRow
                                    className="cursor-pointer"
                                    onClick={() => toggleWeldExpansion(weld.id)}
                                  >
                                    <TableCell className="px-5 font-mono text-xs font-medium text-sky-700">
                                      {weld.jointNo}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-900">
                                      {weld.spoolNo}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {weld.isoNo}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-900">
                                      {weld.welder}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-900">
                                      {mapResultToJointCode(
                                        weld,
                                        batch.tracerSelections,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <ResultBadge result={weld.result} />
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-900">
                                      {weld.reworkCode ?? "—"}
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded ? (
                                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                                      <TableCell
                                        colSpan={7}
                                        className="px-5 py-4"
                                      >
                                        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                                          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                              <FileText className="h-4 w-4 text-sky-600" />
                                              Examination details
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                              <div>
                                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                                  Diameter
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-slate-900">
                                                  {weld.diaInch}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-xs uppercase tracking-wider text-slate-500">
                                                  Weld ID
                                                </p>
                                                <p className="mt-1 text-sm font-medium text-slate-900">
                                                  {weld.id}
                                                </p>
                                              </div>
                                            </div>
                                            <Separator />
                                            <div>
                                              <p className="text-xs uppercase tracking-wider text-slate-500">
                                                Inspector remarks
                                              </p>
                                              <p className="mt-1 text-sm text-slate-700">
                                                {weld.remarks ??
                                                  "No remarks captured."}
                                              </p>
                                            </div>
                                            {weld.result === "Rejected" ? (
                                              <div>
                                                <p className="text-xs uppercase tracking-wider text-red-700">
                                                  Tracer required
                                                </p>
                                                <p className="mt-1 text-sm text-red-700">
                                                  {(
                                                    batch.tracerSelections ?? []
                                                  ).some(
                                                    (t) =>
                                                      t.sourceRejectedWeldId ===
                                                      weld.id,
                                                  )
                                                    ? "Tracer welds selected."
                                                    : "No available tracer candidates in demo seed."}
                                                </p>
                                              </div>
                                            ) : null}
                                          </div>
                                          <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-100/70 p-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                              <Eye className="h-4 w-4 text-sky-600" />
                                              Photos placeholder
                                            </div>
                                            <div className="flex h-24 items-center justify-center rounded-md border border-slate-300 bg-white text-xs text-muted-foreground">
                                              Radiograph frame placeholder
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ) : null}
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="history">
                    <Card className="gap-4 py-5">
                      <CardHeader className="px-5 pb-0">
                        <CardTitle className="text-sm font-medium">
                          Batch timeline
                        </CardTitle>
                        <CardDescription>
                          Chronology of state transitions and disposition events
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-5">
                        <div className="space-y-0">
                          {batch.history.map((event, index) => (
                            <HistoryItem
                              key={`${event.timestamp}-${index}`}
                              event={event}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <SheetFooter className="border-t px-6 py-4">
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {batch.welds.some((w) => w.result === "Rejected")
                      ? `${rejectedCount} welds need disposition before close-out`
                      : closable
                        ? "All welds accepted. Batch can be closed."
                        : "Awaiting additional field actions."}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {batch.status === "Created" ? (
                      <Button size="sm" onClick={handleSend}>
                        <Send className="h-4 w-4" />
                        Send to NDE subcontractor
                      </Button>
                    ) : null}
                    {batch.status === "Issued" ||
                    batch.status === "In Progress" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReceiveResults}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Receive results
                      </Button>
                    ) : null}
                    {batch.status === "Results Received" &&
                    batch.welds.some((w) => w.result === "Rejected") ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmReworkOpen(true)}
                      >
                        <AlertCircle className="h-4 w-4" />
                        Mark for rework
                      </Button>
                    ) : null}
                    {closable ? (
                      <Button size="sm" onClick={handleCloseBatch}>
                        <CheckCircle2 className="h-4 w-4" />
                        Close batch
                      </Button>
                    ) : null}
                  </div>
                </div>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmReworkOpen} onOpenChange={setConfirmReworkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move rejected welds to rework queue?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The batch status will switch to Rework and the rejected welds will
              be dispatched back to fabrication for repair and re-examination.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRework}>
              Confirm rework dispatch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReceiveResultsPanel
        batch={batch}
        open={receivePanelOpen}
        onOpenChange={setReceivePanelOpen}
        onSubmitted={() => {
          // Batch detail panel auto-refreshes from store selectors
        }}
      />
    </>
  );
}
