"use client";

import { useMemo, type ReactNode } from "react";
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
import { StatusCodeBadge } from "@/components/shared/status-code-badge";
import { cn } from "@/lib/utils";
import {
  fabStageToStatusCode,
  statusCodeToLabel,
  type Iso,
  type Testpack,
} from "@/lib/testpack-data";
import { SEED_ISO_SPOOLS } from "@/lib/testpack-seed";
import { useTestpackStore } from "@/store/testpack-store";
import { useErectedStore } from "@/store/erected-store";
import { useSpoolStages } from "@/store/spool-stage";

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
  const stages = useSpoolStages();
  const erectedRecords = useErectedStore((s) => s.records);
  const storeIsos = useTestpackStore((s) => s.isos);

  const rows = useMemo(() => {
    const isoRecord = storeIsos.find((i) => i.id === iso.isoNo);
    const spoolIds =
      SEED_ISO_SPOOLS.find((e) => e.isoId === iso.isoNo)?.spoolIds ??
      iso.spools.map((s) => s.spoolNo);

    if (spoolIds.length === 0) return iso.spools;

    return spoolIds.map((spoolNo) => {
      const isRft = isoRecord?.spoolsRFT.includes(spoolNo) ?? false;
      const isErected = erectedRecords.some((r) => r.spoolNo === spoolNo);
      const fabStage = stages.get(spoolNo);
      const statusCode = fabStageToStatusCode(fabStage, isErected, isRft);
      return {
        spoolNo,
        status: statusCodeToLabel(statusCode),
        statusCode,
        stageLabel: fabStage ?? "—",
      };
    });
  }, [iso.isoNo, iso.spools, stages, erectedRecords, storeIsos]);

  type SpoolRow = {
    spoolNo: string;
    status: string;
    statusCode: number;
    stageLabel?: string;
  };
  const displayRows: SpoolRow[] = rows;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-medium">Spool status</CardTitle>
        <CardDescription>
          Live derivation from fabrication and erection stores
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
                Fab stage
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
            {displayRows.map((spool) => (
              <TableRow key={spool.spoolNo}>
                <TableCell className="px-6 font-mono text-xs font-medium text-sky-700">
                  {spool.spoolNo}
                </TableCell>
                <TableCell className="text-sm text-slate-700">
                  {spool.stageLabel ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-slate-900">
                  {spool.status}
                </TableCell>
                <TableCell className="px-6">
                  <StatusCodeBadge
                    code={spool.statusCode}
                    label={spool.status}
                  />
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
            aria-label="Previous ISO"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={!hasNext}
            onClick={onNextIso}
            aria-label="Next ISO"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="spool-status" className="gap-4">
        <TabsList className="h-9">
          <TabsTrigger value="spool-status" className="text-xs">
            Spool status
          </TabsTrigger>
          <TabsTrigger value="isometric-status" className="text-xs">
            Isometric status
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
