"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { useToSiteStore, useErectedStore } from "@/store";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ErectedDetailPanel } from "./erected-detail-panel";

type ErectedStatus = "All" | "Awaiting Erection" | "Erected";

type ErectedRow = {
  spoolNo: string;
  receivedDate: string;
  receivedBy: string;
  receivedW24: string;
  erectedDate?: string;
  erectedBy?: string;
  erectedW24?: string;
  placementLocation?: string;
  status: Exclude<ErectedStatus, "All">;
};

const ERECTED_STATUSES: ErectedStatus[] = [
  "All",
  "Awaiting Erection",
  "Erected",
];

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: ErectedStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const label =
    status === "Awaiting Erection"
      ? "Awaiting Erection"
      : status === "Erected"
        ? "Erected"
        : "All";

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

export function ErectedView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toSiteRecords = useToSiteStore((state) => state.records);
  const erectedRecords = useErectedStore((state) => state.records);
  const [search, setSearch] = useState("");

  const urlStatus = searchParams.get("status");
  const urlSpool = searchParams.get("spool");
  const activeStatus: ErectedStatus =
    urlStatus === "Awaiting"
      ? "Awaiting Erection"
      : urlStatus === "Erected"
        ? "Erected"
        : "All";

  const toSiteMap = useMemo(
    () => new Map(toSiteRecords.map((record) => [record.spoolNo, record])),
    [toSiteRecords],
  );

  const erectedMap = useMemo(
    () => new Map(erectedRecords.map((record) => [record.spoolNo, record])),
    [erectedRecords],
  );

  const rows = useMemo<ErectedRow[]>(() => {
    return toSiteRecords
      .map((toSiteRecord) => {
        const erectedRecord = erectedMap.get(toSiteRecord.spoolNo);
        const status: ErectedRow["status"] = erectedRecord
          ? "Erected"
          : "Awaiting Erection";
        return {
          spoolNo: toSiteRecord.spoolNo,
          receivedDate: toSiteRecord.receivedDate,
          receivedBy: toSiteRecord.receivedBy,
          receivedW24: toSiteRecord.w24FormNo,
          erectedDate: erectedRecord?.erectedDate,
          erectedBy: erectedRecord?.erectedBy,
          erectedW24: erectedRecord?.w24FormNo,
          placementLocation: erectedRecord?.placementLocation,
          status,
        };
      })
      .filter((row) => {
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
      })
      .sort((a, b) => a.spoolNo.localeCompare(b.spoolNo));
  }, [activeStatus, toSiteRecords, erectedMap, search]);

  const counts = useMemo(() => {
    const counts: Record<ErectedStatus, number> = {
      All: 0,
      "Awaiting Erection": 0,
      Erected: 0,
    };

    for (const record of toSiteRecords) {
      counts.All += 1;
      if (erectedMap.get(record.spoolNo)) {
        counts.Erected += 1;
      } else {
        counts["Awaiting Erection"] += 1;
      }
    }

    return counts;
  }, [toSiteRecords, erectedMap]);

  const setStatus = (status: ErectedStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "All") {
      params.delete("status");
    } else {
      params.set(
        "status",
        status === "Awaiting Erection" ? "Awaiting" : "Erected",
      );
    }
    const query = params.toString();
    router.replace(query ? `/erection/erected?${query}` : "/erection/erected", {
      scroll: false,
    });
  };

  const openSpool = (spoolNo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("spool", spoolNo);
    if (activeStatus !== "All" && !params.has("status")) {
      params.set(
        "status",
        activeStatus === "Awaiting Erection" ? "Awaiting" : "Erected",
      );
    }
    router.replace(`/erection/erected?${params.toString()}`, { scroll: false });
  };

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("spool");
    const query = params.toString();
    router.replace(query ? `/erection/erected?${query}` : "/erection/erected", {
      scroll: false,
    });
  };

  const emptyText =
    activeStatus === "Awaiting Erection"
      ? "No spools awaiting erection."
      : activeStatus === "Erected"
        ? "No spools marked as erected yet."
        : "No spools have been received at site.";

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[720px] flex-col gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pb-2 pt-6">
        <h1 className="text-lg font-semibold text-slate-900">Erected</h1>
        <p className="text-sm text-slate-500">
          §12.5 — confirm spool erection at site from the W-24 QC form once the
          area supervisor confirms placement.
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-3">
        {ERECTED_STATUSES.map((status) => (
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
                      Received
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Erected
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Placement Location
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      W-24 No
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.spoolNo}
                      onClick={() => openSpool(row.spoolNo)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-slate-50",
                        urlSpool === row.spoolNo ? "bg-sky-50" : "",
                      )}
                    >
                      <td className="border-b border-slate-100 px-2 py-2 font-mono text-slate-900">
                        {row.spoolNo}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 text-slate-700">
                        {row.receivedDate}
                        <span className="ml-1 text-slate-500">
                          ({row.receivedBy})
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 text-slate-700">
                        {row.erectedDate ? (
                          <>
                            {row.erectedDate}
                            <span className="ml-1 text-slate-500">
                              ({row.erectedBy})
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 text-slate-700">
                        {row.placementLocation || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 font-mono text-xs text-slate-700">
                        {row.erectedW24 || row.receivedW24}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                            row.status === "Erected"
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : "border-amber-200 bg-amber-50 text-amber-700",
                          )}
                        >
                          {row.status === "Erected"
                            ? "Erected"
                            : "Awaiting Erection"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ErectedDetailPanel
        spoolNo={urlSpool}
        open={!!urlSpool}
        onOpenChange={(open) => {
          if (!open) closePanel();
        }}
      />
    </div>
  );
}
