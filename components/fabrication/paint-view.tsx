"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  useSpoolStages,
  usePaintStore,
} from "@/store";
import {
  STAGE_COLOR,
  type SpoolFabStage,
  type PaintRecord,
} from "@/lib/spool-data";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PaintDetailPanel } from "./paint-detail-panel";

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

type PaintStatus = "All" | "Awaiting" | "InShop" | "Painted";

const PAINT_STATUSES: PaintStatus[] = ["All", "Awaiting", "InShop", "Painted"];

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: PaintStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const label =
    status === "Awaiting"
      ? "Awaiting Dispatch"
      : status === "InShop"
        ? "In Paint Shop"
        : status;
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-sky-600 text-white border-sky-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
      )}
    >
      {label}
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

function StagePill({ stage }: { stage: SpoolFabStage }) {
  const colors = STAGE_COLOR[stage];
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

export function PaintView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stages = useSpoolStages();
  const paintRecords = usePaintStore((s) => s.records);

  const [search, setSearch] = useState("");

  const urlStatusRaw = searchParams.get("status");
  const urlSpool = searchParams.get("spool");

  const activeStatus: PaintStatus =
    urlStatusRaw && PAINT_STATUSES.includes(urlStatusRaw as PaintStatus)
      ? (urlStatusRaw as PaintStatus)
      : "Awaiting";

  const paintMap = useMemo(() => {
    return new Map<string, PaintRecord>(paintRecords.map((r) => [r.spoolNo, r]));
  }, [paintRecords]);

  const rows = useMemo(() => {
    const all = [...stages.entries()]
      .filter(([, s]) => s === "QC Release" || s === "Sent to Paint" || s === "Painted")
      .map(([spoolNo, stage]) => {
        const record = paintMap.get(spoolNo);
        return { spoolNo, stage, record };
      })
      .filter((row) => {
        if (activeStatus === "Awaiting" && row.stage !== "QC Release") return false;
        if (activeStatus === "InShop" && row.stage !== "Sent to Paint") return false;
        if (activeStatus === "Painted" && row.stage !== "Painted") return false;
        if (search) {
          const term = search.toLowerCase();
          if (!row.spoolNo.toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => a.spoolNo.localeCompare(b.spoolNo));
    return all;
  }, [stages, paintMap, activeStatus, search]);

  const counts = useMemo(() => {
    let awaiting = 0;
    let inShop = 0;
    let painted = 0;
    for (const [, stage] of stages) {
      if (stage === "QC Release") awaiting++;
      else if (stage === "Sent to Paint") inShop++;
      else if (stage === "Painted") painted++;
    }
    return {
      All: awaiting + inShop + painted,
      Awaiting: awaiting,
      InShop: inShop,
      Painted: painted,
    };
  }, [stages]);

  const setStatus = (status: PaintStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "Awaiting") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.replace(`/fabrication/paint?${params.toString()}`);
  };

  const openSpool = (spoolNo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("spool", spoolNo);
    if (!params.has("status") && activeStatus !== "Awaiting") {
      params.set("status", activeStatus);
    }
    router.replace(`/fabrication/paint?${params.toString()}`);
  };

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("spool");
    router.replace(`/fabrication/paint?${params.toString()}`);
  };

  const selectedSpool = urlSpool ?? null;

  const emptyText =
    activeStatus === "Awaiting"
      ? "No spools awaiting paint dispatch."
      : activeStatus === "InShop"
        ? "No spools currently at the paint subcontractor."
        : activeStatus === "Painted"
          ? "No painted spools yet."
          : "No spools in any paint stage.";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[720px] gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-2">
        <h1 className="text-lg font-semibold text-slate-900">Paint</h1>
        <p className="text-sm text-slate-500">
          Subcontractor coating dispatch and return inspection
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-3">
        {PAINT_STATUSES.map((s) => (
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
              {activeStatus === "Awaiting" && (
                <TableRow>
                  <TableHead>Spool No</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              )}
              {activeStatus === "InShop" && (
                <TableRow>
                  <TableHead>Spool No</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Paint system</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Dispatched</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              )}
              {activeStatus === "Painted" && (
                <TableRow>
                  <TableHead>Spool No</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Paint system</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Dispatched</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>DFT</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              )}
              {activeStatus === "All" && (
                <TableRow>
                  <TableHead>Spool No</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Paint system</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {rows.map(({ spoolNo, stage, record }) => (
                <TableRow
                  key={spoolNo}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => openSpool(spoolNo)}
                >
                  <TableCell className="font-mono text-sm">{spoolNo}</TableCell>
                  <TableCell>
                    <StagePill stage={stage} />
                  </TableCell>
                  {activeStatus === "Awaiting" && <TableCell />}
                  {(activeStatus === "InShop" || activeStatus === "All") && (
                    <>
                      <TableCell className="text-sm text-slate-600">
                        {record?.paintSystem ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.subcontractor ?? "—"}
                      </TableCell>
                    </>
                  )}
                  {activeStatus === "InShop" && (
                    <TableCell className="text-sm text-slate-600">
                      {record?.dispatchDate ? (
                        <RelativeDate isoDate={record.dispatchDate} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {activeStatus === "Painted" && (
                    <>
                      <TableCell className="text-sm text-slate-600">
                        {record?.paintSystem ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.subcontractor ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.dispatchDate ? (
                          <RelativeDate isoDate={record.dispatchDate} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.returnDate ? (
                          <RelativeDate isoDate={record.returnDate} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.dftMicrons !== undefined
                          ? `${record.dftMicrons} µm`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.finalQCInspector ?? "—"}
                      </TableCell>
                    </>
                  )}
                  {activeStatus === "All" && <TableCell />}
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PaintDetailPanel
        spoolNo={selectedSpool}
        open={!!selectedSpool}
        onOpenChange={(open) => {
          if (!open) closePanel();
        }}
      />
    </div>
  );
}
