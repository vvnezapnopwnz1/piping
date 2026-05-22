"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import {
  useToSiteStore,
  useFieldMaterialCheckStore,
  useErectionStore,
} from "@/store";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useScopeLock } from "@/lib/scope-lock";
import { FieldMaterialCheckDetailPanel } from "./field-material-check-detail-panel";

type MCStatus =
  | "All"
  | "Awaiting MC"
  | "Non-conformance"
  | "Ready to Sign"
  | "Cleared";

const MC_STATUSES: MCStatus[] = [
  "All",
  "Awaiting MC",
  "Non-conformance",
  "Ready to Sign",
  "Cleared",
];

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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
      )}
    >
      {status}
      <span
        className={cn(
          "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full text-[10px] font-semibold",
          active ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        {count}
      </span>
    </button>
  );
}

type MCRow = {
  spoolNo: string;
  totalJoints: number;
  clearedJoints: number;
  ncJoints: number;
  pendingJoints: number;
  allCleared: boolean;
  hasRecords: boolean;
  status: Exclude<MCStatus, "All">;
  toSiteDate?: string;
  receivedBy?: string;
  w24FormNo?: string;
};

function deriveSpoolMCStatus(
  row: Pick<MCRow, "allCleared" | "hasRecords" | "pendingJoints" | "ncJoints">,
): Exclude<MCStatus, "All"> {
  if (row.allCleared) return "Cleared";
  if (row.ncJoints > 0) return "Non-conformance";
  if (!row.hasRecords || row.pendingJoints > 0) return "Awaiting MC";
  return "Ready to Sign";
}

export function FieldMaterialCheckView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toSiteRecords = useToSiteStore((state) => state.records);
  const mcRecords = useFieldMaterialCheckStore((state) => state.records);
  const fieldWelds = useErectionStore((state) => state.fieldWelds);
  const scope = useScopeLock();
  const [search, setSearch] = useState("");

  const urlStatus = searchParams.get("status");
  const urlSpool = searchParams.get("spool");
  const activeStatus: MCStatus =
    urlStatus === "Awaiting MC" ||
    urlStatus === "NC" ||
    urlStatus === "Ready to Sign" ||
    urlStatus === "Cleared"
      ? urlStatus === "NC"
        ? "Non-conformance"
        : urlStatus
      : "All";

  const toSiteMap = useMemo(
    () => new Map(toSiteRecords.map((record) => [record.spoolNo, record])),
    [toSiteRecords],
  );

  const mcBySpool = useMemo(() => {
    const map = new Map<string, typeof mcRecords>();
    for (const record of mcRecords) {
      const list = map.get(record.spoolNo) ?? [];
      list.push(record);
      map.set(record.spoolNo, list);
    }
    return map;
  }, [mcRecords]);

  const rows = useMemo<MCRow[]>(() => {
    const spoolNos = [...new Set(fieldWelds.map((w) => w.spoolNo))].sort();

    return spoolNos
      .map((spoolNo) => {
        const joints = fieldWelds.filter((w) => w.spoolNo === spoolNo);
        const totalJoints = joints.length;
        const mcList = mcBySpool.get(spoolNo) ?? [];
        const hasRecords = mcList.length > 0;

        let clearedJoints = 0;
        let ncJoints = 0;
        let pendingJoints = 0;

        for (const record of mcList) {
          const ncCount = record.pieces.filter(
            (p) => p.status === "Non-conformance",
          ).length;
          if (record.signedOffDate) {
            clearedJoints += 1;
          } else if (ncCount > 0) {
            ncJoints += 1;
          } else {
            pendingJoints += 1;
          }
        }

        const jointIds = new Set(joints.map((j) => j.id));
        const jointsWithRecord = new Set(
          mcList
            .filter((r) => jointIds.has(r.fieldJointId))
            .map((r) => r.fieldJointId),
        );
        pendingJoints += totalJoints - jointsWithRecord.size;
        const allCleared = totalJoints > 0 && clearedJoints === totalJoints;

        const ts = toSiteMap.get(spoolNo);
        const status = deriveSpoolMCStatus({
          allCleared,
          hasRecords,
          pendingJoints,
          ncJoints,
        });

        return {
          spoolNo,
          totalJoints,
          clearedJoints,
          ncJoints,
          pendingJoints,
          allCleared,
          hasRecords,
          status,
          toSiteDate: ts?.receivedDate,
          receivedBy: ts?.receivedBy,
          w24FormNo: ts?.w24FormNo,
        };
      })
      .filter((row) => {
        if (
          !scope.isInScope(
            (row as { pdsAreaCode?: string }).pdsAreaCode,
          )
        ) {
          return false;
        }
        if (activeStatus !== "All" && row.status !== activeStatus) {
          return false;
        }
        if (
          search &&
          !row.spoolNo.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      });
  }, [activeStatus, fieldWelds, mcBySpool, search, toSiteMap, scope]);

  const counts = useMemo(() => {
    const counts: Record<MCStatus, number> = {
      All: 0,
      "Awaiting MC": 0,
      "Non-conformance": 0,
      "Ready to Sign": 0,
      Cleared: 0,
    };

    const spoolNos = [...new Set(fieldWelds.map((w) => w.spoolNo))].sort();
    for (const spoolNo of spoolNos) {
      const joints = fieldWelds.filter((w) => w.spoolNo === spoolNo);
      const totalJoints = joints.length;
      const mcList = mcBySpool.get(spoolNo) ?? [];
      const hasRecords = mcList.length > 0;

      let clearedJoints = 0;
      let ncJoints = 0;
      let pendingJoints = 0;

      for (const record of mcList) {
        const ncCount = record.pieces.filter(
          (p) => p.status === "Non-conformance",
        ).length;
        if (record.signedOffDate) {
          clearedJoints += 1;
        } else if (ncCount > 0) {
          ncJoints += 1;
        } else {
          pendingJoints += 1;
        }
      }

      const jointIds = new Set(joints.map((j) => j.id));
      const jointsWithRecord = new Set(
        mcList
          .filter((r) => jointIds.has(r.fieldJointId))
          .map((r) => r.fieldJointId),
      );
      pendingJoints += totalJoints - jointsWithRecord.size;
      const allCleared = totalJoints > 0 && clearedJoints === totalJoints;

      const status = deriveSpoolMCStatus({
        allCleared,
        hasRecords,
        pendingJoints,
        ncJoints,
      });
      counts.All += 1;
      counts[status] += 1;
    }

    return counts;
  }, [fieldWelds, mcBySpool]);

  const setStatus = (status: MCStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "All") {
      params.delete("status");
    } else if (status === "Non-conformance") {
      params.set("status", "NC");
    } else {
      params.set("status", status);
    }
    const query = params.toString();
    router.replace(
      query ? `/erection/material-check?${query}` : "/erection/material-check",
      { scroll: false },
    );
  };

  const openSpool = (spoolNo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("spool", spoolNo);
    if (activeStatus !== "All" && !params.has("status")) {
      params.set("status", activeStatus);
    }
    router.replace(`/erection/material-check?${params.toString()}`, {
      scroll: false,
    });
  };

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("spool");
    const query = params.toString();
    router.replace(
      query ? `/erection/material-check?${query}` : "/erection/material-check",
      { scroll: false },
    );
  };

  const emptyText =
    activeStatus === "Awaiting MC"
      ? "No spools awaiting field material check."
      : activeStatus === "Non-conformance"
        ? "No spools with open non-conformances."
        : activeStatus === "Ready to Sign"
          ? "No spools ready to sign off."
          : activeStatus === "Cleared"
            ? "No spools with cleared material check."
            : "No spools available for material check.";

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[720px] flex-col gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pb-2 pt-6">
        <h1 className="text-lg font-semibold text-slate-900">
          Field Material Check
        </h1>
        <p className="text-sm text-slate-500">
          §12.2 — verify field-joint heat numbers and mill certificates before
          erection.
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-3 flex-wrap">
        {MC_STATUSES.map((status) => (
          <StatusChip
            key={status}
            status={status}
            count={counts[status]}
            active={activeStatus === status}
            onClick={() => setStatus(status)}
          />
        ))}
      </div>

      <div className="shrink-0 px-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search spool…"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Spool No
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Progress
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      NC
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      To Site Date
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      W-24 No
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.spoolNo}
                      onClick={() => openSpool(row.spoolNo)}
                      className={cn(
                        "cursor-pointer border-b border-slate-200 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50",
                        "hover:bg-slate-100",
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-2">
                        <span className="font-mono text-xs font-semibold text-sky-700">
                          {row.spoolNo}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            row.status === "Cleared"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : row.status === "Non-conformance"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : row.status === "Ready to Sign"
                                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700",
                          )}
                        >
                          {row.clearedJoints}/{row.totalJoints} joints
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {row.ncJoints > 0 ? (
                          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">
                            {row.ncJoints}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-700">
                        {row.toSiteDate
                          ? `${row.toSiteDate} · ${row.receivedBy ?? "—"}`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-700">
                        {row.w24FormNo ? (
                          <span className="font-mono">{row.w24FormNo}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <FieldMaterialCheckDetailPanel
        spoolNo={urlSpool ?? null}
        open={!!urlSpool}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) {
            closePanel();
          }
        }}
      />
    </div>
  );
}
