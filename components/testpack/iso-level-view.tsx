"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  STATUS_CODE_TOOLTIPS,
  type Iso,
  type Testpack,
} from "@/lib/testpack-data";

function spoolDotColor(statusCode: number) {
  if (statusCode === 12) return "bg-emerald-500";
  if (statusCode === 8) return "bg-amber-500";
  return "bg-red-500";
}

function IsometricStatusPanel({ iso }: { iso: Iso }) {
  const s = iso.isometricStatus;
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "ISO completed (all spools supported)",
      value: s.completedDate
        ? format(new Date(s.completedDate), "dd MMM yyyy")
        : "—",
    },
    {
      label: "Assigned for line checking",
      value: s.lineCheckAssignedDate
        ? format(new Date(s.lineCheckAssignedDate), "dd MMM yyyy")
        : "—",
    },
    {
      label: "Returned from line checking",
      value: s.lineCheckReturnedDate
        ? format(new Date(s.lineCheckReturnedDate), "dd MMM yyyy")
        : "—",
    },
    { label: "Cat X items to clear", value: s.itemsCatXToClear },
    { label: "Joints to be welded", value: s.jointsToBeWelded },
    { label: "Flange joints to be bolted", value: s.flangesToBeBolted },
    { label: "Joints awaiting NDE", value: s.jointsAwaitingNde },
    {
      label: "QC released for test",
      value: s.qcReleasedDate
        ? format(new Date(s.qcReleasedDate), "dd MMM yyyy")
        : "—",
    },
    {
      label: "Ready for test",
      value: s.readyForTestDate
        ? format(new Date(s.readyForTestDate), "dd MMM yyyy")
        : "—",
    },
  ];

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5 pb-0">
        <CardTitle className="text-sm font-medium">Isometric status</CardTitle>
        <CardDescription>
          Based on spools belonging to this test pack
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {rows.map((f) => (
            <div
              key={f.label}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
            >
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="font-medium text-slate-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function SpoolStatusGrid({ iso }: { iso: Iso }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-medium">Spool status</CardTitle>
        <CardDescription>
          Color coding: green = Ready For Test, amber = In Progress, red = Not
          Ready
        </CardDescription>
      </CardHeader>
      <div className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Spool No
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </TableHead>
              <TableHead className="px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Code
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {iso.spools.map((spool) => (
              <TableRow key={spool.spoolNo}>
                <TableCell className="px-6 font-mono text-xs font-medium text-sky-700">
                  {spool.spoolNo}
                </TableCell>
                <TableCell className="text-sm text-slate-900">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        spoolDotColor(spool.statusCode),
                      )}
                    />
                    {spool.status}
                  </div>
                </TableCell>
                <TableCell className="px-6">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="font-mono text-xs">
                          {spool.statusCode}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {STATUS_CODE_TOOLTIPS[spool.statusCode] ??
                          `Status code ${spool.statusCode}`}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

interface IsoLevelViewProps {
  testpack: Testpack;
  iso: Iso;
  isoIndex: number;
  onPrevIso: () => void;
  onNextIso: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function IsoLevelView({
  testpack,
  iso,
  isoIndex,
  onPrevIso,
  onNextIso,
  hasPrev,
  hasNext,
}: IsoLevelViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {testpack.id} · ISO {isoIndex + 1} of {testpack.isos.length}
          </p>
          <h2 className="font-mono text-xl font-bold text-slate-900">
            {iso.isoNo}
          </h2>
          <p className="text-sm text-muted-foreground">Rev {iso.rev}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={!hasPrev}
            onClick={onPrevIso}
            aria-label="Previous isometric"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={!hasNext}
            onClick={onNextIso}
            aria-label="Next isometric"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="spool-status" className="gap-4">
        <TabsList className="h-9">
          <TabsTrigger value="spool-status" className="text-xs">
            Spool Status
          </TabsTrigger>
          <TabsTrigger value="isometric-status" className="text-xs">
            Isometric Status
          </TabsTrigger>
        </TabsList>
        <TabsContent value="spool-status">
          <SpoolStatusGrid iso={iso} />
        </TabsContent>
        <TabsContent value="isometric-status">
          <IsometricStatusPanel iso={iso} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
