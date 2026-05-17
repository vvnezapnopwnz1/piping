"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useSpoolStages, useLaydownStore } from "@/store";
import {
  STAGE_COLOR,
  type SpoolFabStage,
  type LaydownRecord,
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

import { LaydownDetailPanel } from "./laydown-detail-panel";

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

type LaydownStatus = "All" | "Awaiting" | "InYard" | "Released";

const LAYDOWN_STATUSES: LaydownStatus[] = [
  "All",
  "Awaiting",
  "InYard",
  "Released",
];

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: LaydownStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const label =
    status === "Awaiting"
      ? "Awaiting Placement"
      : status === "InYard"
        ? "In Yard"
        : status === "Released"
          ? "Released to Site"
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

export function LaydownView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stages = useSpoolStages();
  const laydownRecords = useLaydownStore((s) => s.records);

  const [search, setSearch] = useState("");

  const urlStatusRaw = searchParams.get("status");
  const urlSpool = searchParams.get("spool");

  const activeStatus: LaydownStatus =
    urlStatusRaw && LAYDOWN_STATUSES.includes(urlStatusRaw as LaydownStatus)
      ? (urlStatusRaw as LaydownStatus)
      : "Awaiting";

  const laydownMap = useMemo(() => {
    return new Map<string, LaydownRecord>(
      laydownRecords.map((r) => [r.spoolNo, r]),
    );
  }, [laydownRecords]);

  const rows = useMemo(() => {
    const all = [...stages.entries()]
      .filter(([, s]) => s === "Painted" || s === "Laydown")
      .map(([spoolNo, stage]) => {
        const record = laydownMap.get(spoolNo);
        return { spoolNo, stage, record };
      })
      .filter((row) => {
        if (activeStatus === "Awaiting" && row.stage !== "Painted")
          return false;
        if (
          activeStatus === "InYard" &&
          (row.stage !== "Laydown" || !!row.record?.releasedToSiteDate)
        )
          return false;
        if (
          activeStatus === "Released" &&
          (row.stage !== "Laydown" || !row.record?.releasedToSiteDate)
        )
          return false;
        if (search) {
          const term = search.toLowerCase();
          if (!row.spoolNo.toLowerCase().includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => a.spoolNo.localeCompare(b.spoolNo));
    return all;
  }, [stages, laydownMap, activeStatus, search]);

  const counts = useMemo(() => {
    let awaiting = 0;
    let inYard = 0;
    let released = 0;
    for (const [, stage] of stages) {
      if (stage === "Painted") awaiting++;
      else if (stage === "Laydown") {
        // Need to check if released — but we don't have laydownMap here in a clean way
        // We'll iterate stages and look up in laydownMap from the closure
      }
    }
    // Better: iterate laydownMap to count released vs in-yard
    for (const [spoolNo, record] of laydownMap) {
      if (stages.get(spoolNo) === "Laydown") {
        if (record.releasedToSiteDate) released++;
        else inYard++;
      }
    }
    // Also count Painted spools that are NOT in laydownMap
    for (const [spoolNo, stage] of stages) {
      if (stage === "Painted" && !laydownMap.has(spoolNo)) {
        awaiting++;
      }
    }
    return {
      All: awaiting + inYard + released,
      Awaiting: awaiting,
      InYard: inYard,
      Released: released,
    };
  }, [stages, laydownMap]);

  const setStatus = (status: LaydownStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "Awaiting") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.replace(`/fabrication/laydown?${params.toString()}`);
  };

  const openSpool = (spoolNo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("spool", spoolNo);
    if (!params.has("status") && activeStatus !== "Awaiting") {
      params.set("status", activeStatus);
    }
    router.replace(`/fabrication/laydown?${params.toString()}`);
  };

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("spool");
    router.replace(`/fabrication/laydown?${params.toString()}`);
  };

  const selectedSpool = urlSpool ?? null;

  const emptyText =
    activeStatus === "Awaiting"
      ? "No spools awaiting yard placement."
      : activeStatus === "InYard"
        ? "No spools currently in the laydown yard."
        : activeStatus === "Released"
          ? "No spools released to site yet."
          : "No spools in any laydown stage.";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[720px] gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-2">
        <h1 className="text-lg font-semibold text-slate-900">Laydown</h1>
        <p className="text-sm text-slate-500">
          Yard placement and release to site
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-3">
        {LAYDOWN_STATUSES.map((s) => (
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
              {activeStatus === "InYard" && (
                <TableRow>
                  <TableHead>Spool No</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Yard location</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead>Placed by</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              )}
              {activeStatus === "Released" && (
                <TableRow>
                  <TableHead>Spool No</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Yard location</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead>Placed by</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead>Released by</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              )}
              {activeStatus === "All" && (
                <TableRow>
                  <TableHead>Spool No</TableHead>
                  <TableHead>Stage</TableHead>
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
                  {(activeStatus === "InYard" ||
                    activeStatus === "Released") && (
                    <>
                      <TableCell className="text-sm text-slate-600">
                        {record?.yardLocation ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.placedDate ? (
                          <RelativeDate isoDate={record.placedDate} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.placedBy ?? "—"}
                      </TableCell>
                    </>
                  )}
                  {activeStatus === "Released" && (
                    <>
                      <TableCell className="text-sm text-slate-600">
                        {record?.releasedToSiteDate ? (
                          <RelativeDate isoDate={record.releasedToSiteDate} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {record?.releasedBy ?? "—"}
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

      <LaydownDetailPanel
        spoolNo={selectedSpool}
        open={!!selectedSpool}
        onOpenChange={(open: boolean) => {
          if (!open) closePanel();
        }}
      />
    </div>
  );
}
