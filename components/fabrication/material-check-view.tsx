"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useSpoolStages, useSpoolsStore } from "@/store";
import {
  STAGE_COLOR,
  type SpoolFabStage,
  type MaterialCheckRecord,
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

import { MaterialCheckDetailPanel } from "./material-check-detail-panel";

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

type MCStatus = "All" | "Pending" | "Approved" | "NC";

function deriveMCStatus(rec: MaterialCheckRecord): Exclude<MCStatus, "All"> {
  if (rec.pieces.some((p) => p.status === "Non-conformance")) return "NC";
  if (rec.signedOffDate) return "Approved";
  return "Pending";
}

const MC_STATUSES: MCStatus[] = ["All", "Pending", "Approved", "NC"];

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: MCStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
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
      {status}
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

export function MaterialCheckView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stages = useSpoolStages();
  const records = useSpoolsStore((s) => s.records);

  const [search, setSearch] = useState("");

  const urlStatusRaw = searchParams.get("status");
  const urlSpool = searchParams.get("spool");

  const activeStatus: MCStatus =
    urlStatusRaw && MC_STATUSES.includes(urlStatusRaw as MCStatus)
      ? (urlStatusRaw as MCStatus)
      : "All";

  const counts = useMemo(() => {
    const c: Record<MCStatus, number> = {
      All: records.length,
      Pending: 0,
      Approved: 0,
      NC: 0,
    };
    for (const rec of records) {
      const status = deriveMCStatus(rec);
      c[status]++;
    }
    return c;
  }, [records]);

  const rows = useMemo(() => {
    const filtered = records.filter((rec) => {
      const status = deriveMCStatus(rec);
      if (activeStatus !== "All" && status !== activeStatus) return false;
      if (search) {
        const term = search.toLowerCase();
        const hay = [rec.spoolNo, ...rec.pieces.map((p) => p.heatNumber)]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    return filtered.map((rec) => {
      const stage = stages.get(rec.spoolNo) ?? "Not Started";
      return { spoolNo: rec.spoolNo, stage, record: rec };
    });
  }, [records, stages, activeStatus, search]);

  const setStatus = (status: MCStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "All") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.replace(`/fabrication/material-check?${params.toString()}`);
  };

  const openSpool = (spoolNo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("spool", spoolNo);
    if (!params.has("status") && activeStatus !== "All") {
      params.set("status", activeStatus);
    }
    router.replace(`/fabrication/material-check?${params.toString()}`);
  };

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("spool");
    router.replace(`/fabrication/material-check?${params.toString()}`);
  };

  const selectedSpool = urlSpool ?? null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[720px] gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-2">
        <h1 className="text-lg font-semibold text-slate-900">Material Check</h1>
        <p className="text-sm text-slate-500">
          Verify heat numbers and mill certificates before welding
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-3">
        {MC_STATUSES.map((s) => (
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
            placeholder="Search spool or heat number…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-sm">No spools at this status.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spool No</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Pieces</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Signed off</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ spoolNo, stage, record }) => {
                const nc = record.nonConformanceCount;
                const total = record.pieces.length;
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
                    <TableCell className="text-sm">
                      <span
                        className={cn(nc > 0 && "text-red-600 font-medium")}
                      >
                        {total} piece{total === 1 ? "" : "s"}
                        {nc > 0 ? ` · ${nc} NC` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {record.inspector ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {record.signedOffDate ? (
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

      <MaterialCheckDetailPanel
        spoolNo={selectedSpool}
        open={!!selectedSpool}
        onOpenChange={(open) => {
          if (!open) closePanel();
        }}
      />
    </div>
  );
}
