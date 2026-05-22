"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useSpoolErectionStages } from "@/store/erection-rollup";
import { useFieldQCReleaseStore } from "@/store/field-qc-release-store";
import {
  ERECTION_STAGE_COLOR,
  type SpoolErectionStage,
} from "@/lib/erection-stage";
import type { QCReleaseRecord } from "@/lib/spool-data";
import { cn } from "@/lib/utils";
import { useScopeLock } from "@/lib/scope-lock";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { FieldQCReleaseDetailPanel } from "./field-qc-release-detail-panel";

function RelativeDate({ isoDate }: { isoDate: string }) {
  const [relative, setRelative] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date(isoDate);
    if (!Number.isNaN(d.getTime())) {
      setRelative(formatDistanceToNow(d, { addSuffix: true }));
    }
  }, [isoDate]);
  if (relative) return <span>{relative}</span>;
  const d = new Date(isoDate);
  return (
    <span>
      {Number.isNaN(d.getTime())
        ? isoDate
        : d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
    </span>
  );
}

type QCStatus = "All" | "Awaiting" | "Released";

const QC_STATUSES: QCStatus[] = ["All", "Awaiting", "Released"];

const QUEUE_STAGES: SpoolErectionStage[] = [
  "Supported",
  "Field QC Released",
];

function deriveQCProgress(record: QCReleaseRecord | undefined): {
  passed: number;
  remark: number;
  text: string;
} {
  if (!record) return { passed: 0, remark: 0, text: "0/4" };
  const entries = record.entries;
  const passed = entries.filter(
    (e) => e.status === "Pass" || e.status === "Pass with remark",
  ).length;
  const remark = entries.filter((e) => e.status === "Pass with remark").length;
  let text = `${passed}/4 passed`;
  if (remark > 0) text += ` · ${remark} remark`;
  return { passed, remark, text };
}

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: QCStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-sky-600 text-white border-sky-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
      )}
    >
      {status === "Awaiting" ? "Awaiting Release" : status}
      <span
        className={cn(
          "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold",
          active ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function StagePill({ stage }: { stage: SpoolErectionStage }) {
  const colors = ERECTION_STAGE_COLOR[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border",
        colors.bg,
        colors.text,
        "border-current/20",
      )}
    >
      {stage}
    </span>
  );
}

export function FieldQCReleaseView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stages = useSpoolErectionStages();
  const qcRecords = useFieldQCReleaseStore((s) => s.records);
  const scope = useScopeLock();

  const [search, setSearch] = useState("");

  const urlStatusRaw = searchParams.get("status");
  const urlSpool = searchParams.get("spool");

  const activeStatus: QCStatus =
    urlStatusRaw && QC_STATUSES.includes(urlStatusRaw as QCStatus)
      ? (urlStatusRaw as QCStatus)
      : "Awaiting";

  const qcMap = useMemo(() => {
    return new Map<string, QCReleaseRecord>(qcRecords.map((r) => [r.spoolNo, r]));
  }, [qcRecords]);

  const rows = useMemo(() => {
    const all = stages
      .filter((s) => QUEUE_STAGES.includes(s.stage))
      .map(({ spoolNo, stage }) => {
        const record = qcMap.get(spoolNo);
        return { spoolNo, stage, record };
      })
      .filter((row) => {
        if (
          !scope.isInScope(
            (row as { pdsAreaCode?: string }).pdsAreaCode,
          )
        ) {
          return false;
        }
        if (activeStatus === "Awaiting" && row.stage !== "Supported") return false;
        if (activeStatus === "Released" && row.stage !== "Field QC Released")
          return false;
        if (search) {
          const term = search.toLowerCase();
          if (!row.spoolNo.toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => a.spoolNo.localeCompare(b.spoolNo));
    return all;
  }, [stages, qcMap, activeStatus, search, scope]);

  const counts = useMemo(() => {
    let awaiting = 0;
    let released = 0;
    for (const { stage } of stages) {
      if (stage === "Supported") awaiting++;
      else if (stage === "Field QC Released") released++;
    }
    return {
      All: awaiting + released,
      Awaiting: awaiting,
      Released: released,
    };
  }, [stages]);

  const setStatus = (status: QCStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "Awaiting") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.replace(`/erection/field-qc-release?${params.toString()}`);
  };

  const openSpool = (spoolNo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("spool", spoolNo);
    if (!params.has("status") && activeStatus !== "Awaiting") {
      params.set("status", activeStatus);
    }
    router.replace(`/erection/field-qc-release?${params.toString()}`);
  };

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("spool");
    router.replace(`/erection/field-qc-release?${params.toString()}`);
  };

  const selectedSpool = urlSpool ?? null;

  const emptyText =
    activeStatus === "Awaiting"
      ? "No spools awaiting field QC release."
      : activeStatus === "Released"
        ? "No spools field-QC released yet."
        : "No Supported or Field QC Released spools.";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[720px] gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-2">
        <h1 className="text-lg font-semibold text-slate-900">Field QC Release</h1>
        <p className="text-sm text-slate-500">
          Final field inspection checklist before RFT auto-gate
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-3">
        {QC_STATUSES.map((s) => (
          <StatusChip
            key={s}
            status={s}
            count={counts[s]}
            active={activeStatus === s}
            onClick={() => setStatus(s)}
          />
        ))}
      </div>

      <div className="shrink-0 px-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search spool…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spool No</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Checklist progress</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Released</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ spoolNo, stage, record }) => {
                const progress = deriveQCProgress(record);
                return (
                  <TableRow
                    key={spoolNo}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => openSpool(spoolNo)}
                  >
                    <TableCell className="font-mono text-sm">
                      {spoolNo}
                    </TableCell>
                    <TableCell>
                      <StagePill stage={stage} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {progress.text}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {record?.inspector ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {record?.signedOffDate ? (
                        <RelativeDate isoDate={record.signedOffDate} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <FieldQCReleaseDetailPanel
        spoolNo={selectedSpool}
        open={!!selectedSpool}
        onOpenChange={(open) => {
          if (!open) closePanel();
        }}
      />
    </div>
  );
}
