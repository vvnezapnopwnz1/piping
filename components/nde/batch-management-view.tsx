"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Scan,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { BatchDetailPanel } from "@/components/nde/batch-detail-panel";
import { CreateBatchDialog } from "@/components/nde/create-batch-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useBatchesKPIs,
  useHydrateBatchesStore,
  type NdeBatch,
  type NdeBatchStatus,
} from "@/store";
import { cn } from "@/lib/utils";

const statusFilters: Array<"All" | NdeBatchStatus> = [
  "All",
  "Created",
  "Issued",
  "In Progress",
  "Results Received",
  "Closed",
  "Rework",
];

const methodOptions = ["All", "RT", "UT", "MT", "PT", "PMI", "HT"] as const;
const subcontractorOptions = [
  "All",
  "Bureau Veritas",
  "SGS Industrial",
  "TÜV Rheinland",
] as const;

// KPI cards rendered dynamically from store selectors below

const latestCreatedDate = (batches: NdeBatch[]) =>
  batches.reduce(
    (latest, batch) => {
      return new Date(batch.createdDate) > latest
        ? new Date(batch.createdDate)
        : latest;
    },
    new Date(batches[0]?.createdDate ?? new Date().toISOString()),
  );

function getDefaultDateRange(batches: NdeBatch[]): DateRange {
  const latest = latestCreatedDate(batches);
  return {
    from: subDays(latest, 30),
    to: latest,
  };
}

const methodBadgeClasses = {
  RT: "border-sky-300 bg-sky-100 text-sky-800",
  UT: "border-violet-300 bg-violet-100 text-violet-800",
  MT: "border-emerald-300 bg-emerald-100 text-emerald-800",
  PT: "border-amber-300 bg-amber-100 text-amber-800",
  PMI: "border-cyan-300 bg-cyan-100 text-cyan-800",
  HT: "border-red-300 bg-red-100 text-red-800",
} as const;

const statusBadgeClasses: Record<NdeBatchStatus, string> = {
  Created: "border-slate-300 bg-slate-100 text-slate-700",
  Issued: "border-sky-300 bg-sky-100 text-sky-800",
  "In Progress": "border-amber-300 bg-amber-100 text-amber-800",
  "Results Received": "border-violet-300 bg-violet-100 text-violet-800",
  Closed: "border-emerald-300 bg-emerald-100 text-emerald-800",
  Rework: "border-red-300 bg-red-100 text-red-800",
};

function MethodBadge({ method }: { method: NdeBatch["method"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        methodBadgeClasses[method],
      )}
    >
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: NdeBatchStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        statusBadgeClasses[status],
      )}
    >
      {status}
    </span>
  );
}

function formatDateLabel(date?: string) {
  if (!date) {
    return "—";
  }

  return format(new Date(date), "dd MMM yyyy");
}

function isWithinRange(date: string, range: DateRange | undefined) {
  if (!range?.from) {
    return true;
  }

  const current = new Date(date);
  const from = new Date(range.from);
  const to = range.to ? new Date(range.to) : new Date(range.from);

  return current >= from && current <= to;
}

export function BatchManagementView() {
  const hasHydrated = useHydrateBatchesStore();
  const batches = useBatchesStore((s) => s.batches);
  const kpis = useBatchesKPIs();
  const issueBatch = useBatchesStore((s) => s.issueBatch);
  const receiveResults = useBatchesStore((s) => s.receiveResults);
  const closeBatchAction = useBatchesStore((s) => s.closeBatch);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] =
    useState<(typeof methodOptions)[number]>("All");
  const [statusFilter, setStatusFilter] =
    useState<(typeof statusFilters)[number]>("All");
  const [subcontractorFilter, setSubcontractorFilter] =
    useState<(typeof subcontractorOptions)[number]>("All");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    getDefaultDateRange(batches),
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [highlightedBatchId, setHighlightedBatchId] = useState<string | null>(
    null,
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesQuery =
        query.length === 0 ||
        batch.id.toLowerCase().includes(query) ||
        batch.welds.some(
          (weld) =>
            weld.spoolNo.toLowerCase().includes(query) ||
            weld.jointNo.toLowerCase().includes(query),
        );

      const matchesMethod =
        methodFilter === "All" || batch.method === methodFilter;
      const matchesStatus =
        statusFilter === "All" || batch.status === statusFilter;
      const matchesSubcontractor =
        subcontractorFilter === "All" ||
        batch.subcontractor === subcontractorFilter;
      const matchesDate = isWithinRange(batch.createdDate, dateRange);

      return (
        matchesQuery &&
        matchesMethod &&
        matchesStatus &&
        matchesSubcontractor &&
        matchesDate
      );
    });
  }, [
    batches,
    dateRange,
    methodFilter,
    search,
    statusFilter,
    subcontractorFilter,
  ]);

  if (!hasHydrated) {
    return null;
  }

  const pulseBatch = (batchId: string) => {
    setHighlightedBatchId(batchId);
    window.setTimeout(
      () =>
        setHighlightedBatchId((current) =>
          current === batchId ? null : current,
        ),
      1400,
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="gap-1 pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
              <Scan className="h-3.5 w-3.5" />
              Active batches
            </CardDescription>
            <CardTitle className="text-[30px] font-semibold tracking-tight">
              {kpis.active}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {kpis.awaitingResults} awaiting results
            </p>
            <div className="text-sm font-medium">Live NDE workload</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-1 pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Acceptance rate
            </CardDescription>
            <CardTitle className="text-[30px] font-semibold tracking-tight">
              {kpis.acceptanceRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Last 30 days</p>
            <div className="text-sm font-medium text-emerald-600">
              +1.2% vs prev period
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="gap-1 pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
              <AlertCircle className="h-3.5 w-3.5" />
              Rework queue
            </CardDescription>
            <CardTitle className="text-[30px] font-semibold tracking-tight">
              {kpis.reworkWelds} welds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Across {kpis.reworkBatches} batches
            </p>
            <div className="text-sm font-medium text-amber-700">
              Action needed
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="gap-1 pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Overdue batches
            </CardDescription>
            <CardTitle className="text-[30px] font-semibold tracking-tight">
              {kpis.overdue}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Results &gt; 5 days late
            </p>
            <div className="text-sm font-medium text-red-600">Escalate</div>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="sticky top-0 z-20 border-b bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1 xl:max-w-[320px]">
                <Scan className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search batch no. / spool / weld..."
                  className="pl-9"
                />
              </div>

              <Select
                value={methodFilter}
                onValueChange={(value) =>
                  setMethodFilter(value as (typeof methodOptions)[number])
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap items-center gap-2">
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      statusFilter === status
                        ? "border-sky-300 bg-sky-100 text-sky-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <Select
                value={subcontractorFilter}
                onValueChange={(value) =>
                  setSubcontractorFilter(
                    value as (typeof subcontractorOptions)[number],
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  {subcontractorOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start gap-2">
                    <Filter className="h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span>
                          {format(dateRange.from, "dd MMM")} -{" "}
                          {format(dateRange.to, "dd MMM")}
                        </span>
                      ) : (
                        <span>{format(dateRange.from, "dd MMM yyyy")}</span>
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={dateRange}
                    defaultMonth={dateRange?.from}
                    onSelect={setDateRange}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create new batch
            </Button>
            <CreateBatchDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onCreated={(batch) => {
                pulseBatch(batch.id);
                toast.success(`${batch.batchNo} created`);
              }}
            />
          </div>
        </div>

        <div className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Batch No
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Method
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Welds
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Spools
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Subcontractor
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Created date
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Issued date
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Acceptance
                </TableHead>
                <TableHead className="px-6 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((batch) => {
                const accepted = batch.welds.filter(
                  (w) => w.result === "Accepted",
                ).length;
                const rejected = batch.welds.filter(
                  (w) => w.result === "Rejected",
                ).length;
                const pending = batch.welds.filter(
                  (w) => w.result === "Pending",
                ).length;
                const acceptanceRate =
                  batch.welds.length > 0
                    ? Math.round((accepted / batch.welds.length) * 1000) / 10
                    : 0;
                const overdueThreshold = Date.now() - 5 * 24 * 60 * 60 * 1000;
                const isOverdue =
                  batch.issuedDate !== undefined &&
                  new Date(batch.issuedDate).getTime() < overdueThreshold &&
                  (batch.status === "Issued" || batch.status === "In Progress");

                return (
                  <TableRow
                    key={batch.id}
                    onClick={() => setSelectedBatchId(batch.id)}
                    className={cn(
                      "cursor-pointer",
                      highlightedBatchId === batch.id &&
                        "bg-sky-50 transition-colors",
                    )}
                  >
                    <TableCell className="px-6">
                      <button className="font-mono text-xs font-medium text-sky-700 hover:text-sky-800">
                        {batch.batchNo}
                      </button>
                    </TableCell>
                    <TableCell>
                      <MethodBadge method={batch.method} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-900">
                        <Scan className="h-3.5 w-3.5 text-slate-400" />
                        {batch.welds.length} welds
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-900">
                      {new Set(batch.welds.map((w) => w.spoolNo)).size}
                    </TableCell>
                    <TableCell className="text-sm text-slate-900">
                      {batch.subcontractor}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateLabel(batch.createdDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateLabel(batch.issuedDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={batch.status} />
                        {isOverdue ? (
                          <Badge className="border-red-300 bg-red-100 text-red-700 hover:bg-red-100">
                            Overdue
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[150px] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-900">
                            {accepted}/{batch.welds.length}
                          </span>
                          <span className="text-muted-foreground">
                            {acceptanceRate}%
                          </span>
                        </div>
                        <Progress
                          value={(accepted / batch.welds.length) * 100}
                          className="h-1.5"
                        />
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{pending} pending</span>
                          <span>{rejected} rejected</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell
                      className="px-6 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSelectedBatchId(batch.id)}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toast.info("Edit flow coming soon")}
                          >
                            <Filter className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={batch.status !== "Created"}
                            onClick={() => {
                              const inspector =
                                batch.welds[0]?.inspector ?? "NDE-INS-04";
                              issueBatch(
                                batch.id,
                                batch.subcontractor,
                                inspector,
                              );
                              toast.success(
                                `${batch.batchNo} issued to ${batch.subcontractor}`,
                              );
                            }}
                          >
                            <Send className="h-4 w-4" />
                            Issue
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              batch.status !== "Issued" &&
                              batch.status !== "In Progress"
                            }
                            onClick={() => {
                              receiveResults(
                                batch.id,
                                batch.welds.map((w) => ({
                                  weldId: w.id,
                                  result: "Accepted" as const,
                                })),
                              );
                              toast.success(
                                `Results received for ${batch.batchNo}`,
                              );
                            }}
                          >
                            <Scan className="h-4 w-4" />
                            Receive Results
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              !(
                                batch.status !== "Closed" &&
                                batch.welds.every(
                                  (w) => w.result === "Accepted",
                                )
                              )
                            }
                            onClick={() => {
                              closeBatchAction(batch.id);
                              toast.success(`${batch.batchNo} closed`);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Close
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredBatches.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                No batches match the current filters
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try widening the date range or clearing one of the active
                filters.
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      <BatchDetailPanel
        batch={selectedBatch}
        open={selectedBatch !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBatchId(null);
          }
        }}
      />
    </div>
  );
}
