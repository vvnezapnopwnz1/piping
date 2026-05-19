"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { useWeldedBoltedStore, useSupportsStore } from "@/store";
import { computeSpoolSupportRollup } from "@/lib/erection-stage";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SupportedDetailPanel } from "./supported-detail-panel";

type SupportStatusFilter =
  | "All"
  | "In Progress"
  | "Ready to Confirm"
  | "Confirmed";

const SUPPORT_STATUSES: SupportStatusFilter[] = [
  "All",
  "In Progress",
  "Ready to Confirm",
  "Confirmed",
];

const STATUS_PARAM_MAP: Record<SupportStatusFilter, string | undefined> = {
  All: undefined,
  "In Progress": "InProgress",
  "Ready to Confirm": "Ready",
  Confirmed: "Confirmed",
};

const PARAM_STATUS_MAP: Record<string, SupportStatusFilter> = {
  InProgress: "In Progress",
  Ready: "Ready to Confirm",
  Confirmed: "Confirmed",
};

interface SupportRow {
  spoolNo: string;
  wbConfirmedDate: string;
  welded: number;
  total: number;
  allWelded: boolean;
  isConfirmed: boolean;
  w23FormNo?: string;
}

function ProgressChip({ welded, total }: { welded: number; total: number }) {
  if (total === 0) {
    return (
      <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
        0/0
      </span>
    );
  }
  if (welded === total) {
    return (
      <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        {welded}/{total}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
      {welded}/{total}
    </span>
  );
}

function ConfirmationBadge({
  allWelded,
  isConfirmed,
}: {
  allWelded: boolean;
  isConfirmed: boolean;
}) {
  if (isConfirmed) {
    return (
      <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        Confirmed
      </span>
    );
  }
  if (allWelded) {
    return (
      <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
      In Progress
    </span>
  );
}

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: SupportStatusFilter;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const label = status === "Ready to Confirm" ? "Ready to Confirm" : status;

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
      {label}
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

export function SupportedView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wbRecords = useWeldedBoltedStore((state) => state.records);
  const supportItems = useSupportsStore((state) => state.items);
  const supportRecords = useSupportsStore((state) => state.records);
  const [search, setSearch] = useState("");

  const urlStatusRaw = searchParams.get("status");
  const urlSpool = searchParams.get("spool");

  const activeStatus: SupportStatusFilter =
    urlStatusRaw && urlStatusRaw in PARAM_STATUS_MAP
      ? PARAM_STATUS_MAP[urlStatusRaw]
      : "All";

  const recordMap = useMemo(() => {
    return new Map<string, (typeof supportRecords)[number]>(
      supportRecords.map((r) => [r.spoolNo, r]),
    );
  }, [supportRecords]);

  const wbMap = useMemo(() => {
    return new Map<string, (typeof wbRecords)[number]>(
      wbRecords.map((r) => [r.spoolNo, r]),
    );
  }, [wbRecords]);

  const rows = useMemo<SupportRow[]>(() => {
    return wbRecords
      .map((wbRecord) => {
        const rollup = computeSpoolSupportRollup(
          wbRecord.spoolNo,
          supportItems,
        );
        const record = recordMap.get(wbRecord.spoolNo);
        return {
          spoolNo: wbRecord.spoolNo,
          wbConfirmedDate: wbRecord.confirmedDate,
          welded: rollup.welded,
          total: rollup.total,
          allWelded: rollup.allWelded,
          isConfirmed: !!record,
          w23FormNo: record?.w23FormNo,
        };
      })
      .filter((row) => {
        if (activeStatus === "In Progress" && row.allWelded) return false;
        if (
          activeStatus === "Ready to Confirm" &&
          (!row.allWelded || row.isConfirmed)
        )
          return false;
        if (activeStatus === "Confirmed" && !row.isConfirmed) return false;
        if (
          search &&
          !row.spoolNo.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.spoolNo.localeCompare(b.spoolNo));
  }, [wbRecords, supportItems, recordMap, activeStatus, search]);

  const counts = useMemo(() => {
    let inProgress = 0;
    let ready = 0;
    let confirmed = 0;

    for (const wbRecord of wbRecords) {
      const rollup = computeSpoolSupportRollup(wbRecord.spoolNo, supportItems);
      const record = recordMap.get(wbRecord.spoolNo);
      if (record) {
        confirmed++;
      } else if (rollup.allWelded) {
        ready++;
      } else {
        inProgress++;
      }
    }

    return {
      All: inProgress + ready + confirmed,
      "In Progress": inProgress,
      "Ready to Confirm": ready,
      Confirmed: confirmed,
    };
  }, [wbRecords, supportItems, recordMap]);

  const setStatus = (status: SupportStatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    const paramValue = STATUS_PARAM_MAP[status];
    if (paramValue) {
      params.set("status", paramValue);
    } else {
      params.delete("status");
    }
    router.replace(`/erection/supported?${params.toString()}`, {
      scroll: false,
    });
  };

  const openSpool = (spoolNo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("spool", spoolNo);
    if (activeStatus !== "All" && !params.has("status")) {
      const paramValue = STATUS_PARAM_MAP[activeStatus];
      if (paramValue) params.set("status", paramValue);
    }
    router.replace(`/erection/supported?${params.toString()}`, {
      scroll: false,
    });
  };

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("spool");
    const query = params.toString();
    router.replace(
      query ? `/erection/supported?${query}` : "/erection/supported",
      { scroll: false },
    );
  };

  const emptyText =
    activeStatus === "In Progress"
      ? "No spools in progress."
      : activeStatus === "Ready to Confirm"
        ? "No spools ready to confirm."
        : activeStatus === "Confirmed"
          ? "No spools confirmed yet."
          : "No welded/bolted spools.";

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[720px] flex-col gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pb-2 pt-6">
        <h1 className="text-lg font-semibold text-slate-900">Supported</h1>
        <p className="text-sm text-slate-500">
          &sect;12.7 &mdash; confirm all supports are erected and welded from
          the W-23 QC form.
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-3 px-6">
        {SUPPORT_STATUSES.map((status) => (
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
                      W&B Confirmed
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Supports
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Confirmation
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      W-23 No
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.spoolNo}
                      className={cn(
                        "cursor-pointer border-b border-slate-100 hover:bg-slate-50",
                        urlSpool === row.spoolNo ? "bg-sky-50" : "",
                      )}
                      onClick={() => openSpool(row.spoolNo)}
                    >
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-slate-900">
                        {row.spoolNo}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                        {row.wbConfirmedDate}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <ProgressChip welded={row.welded} total={row.total} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <ConfirmationBadge
                          allWelded={row.allWelded}
                          isConfirmed={row.isConfirmed}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                        {row.w23FormNo ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <SupportedDetailPanel
        spoolNo={urlSpool}
        open={!!urlSpool}
        onOpenChange={(open: boolean) => {
          if (!open) closePanel();
        }}
      />
    </div>
  );
}
