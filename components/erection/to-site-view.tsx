"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { useLaydownStore, useToSiteStore } from "@/store";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ToSiteDetailPanel } from "./to-site-detail-panel";

type ToSiteStatus = "All" | "Awaiting" | "Received";

type ToSiteRow = {
  spoolNo: string;
  releasedToSiteDate: string;
  releasedBy: string;
  yardLocation: string;
  placedDate: string;
  placedBy: string;
  status: Exclude<ToSiteStatus, "All">;
  w24FormNo?: string;
  receivedBy?: string;
};

const TO_SITE_STATUSES: ToSiteStatus[] = ["All", "Awaiting", "Received"];

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: ToSiteStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const label =
    status === "Awaiting"
      ? "Awaiting Receipt"
      : status === "Received"
        ? "Received"
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

export function ToSiteView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const laydownRecords = useLaydownStore((state) => state.records);
  const toSiteRecords = useToSiteStore((state) => state.records);
  const [search, setSearch] = useState("");

  const urlStatus = searchParams.get("status");
  const urlSpool = searchParams.get("spool");
  const activeStatus: ToSiteStatus =
    urlStatus === "Awaiting" || urlStatus === "Received" ? urlStatus : "All";

  const toSiteMap = useMemo(
    () => new Map(toSiteRecords.map((record) => [record.spoolNo, record])),
    [toSiteRecords],
  );

  const rows = useMemo<ToSiteRow[]>(() => {
    return laydownRecords
      .filter((record) => !!record.releasedToSiteDate)
      .map((record) => {
        const toSiteRecord = toSiteMap.get(record.spoolNo);
        const status: ToSiteRow["status"] = toSiteRecord
          ? "Received"
          : "Awaiting";
        return {
          spoolNo: record.spoolNo,
          releasedToSiteDate: record.releasedToSiteDate ?? "",
          releasedBy: record.releasedBy ?? "—",
          yardLocation: record.yardLocation,
          placedDate: record.placedDate,
          placedBy: record.placedBy,
          status,
          w24FormNo: toSiteRecord?.w24FormNo,
          receivedBy: toSiteRecord?.receivedBy,
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
  }, [activeStatus, laydownRecords, search, toSiteMap]);

  const counts = useMemo(() => {
    const counts: Record<ToSiteStatus, number> = {
      All: 0,
      Awaiting: 0,
      Received: 0,
    };

    for (const record of laydownRecords) {
      if (!record.releasedToSiteDate) {
        continue;
      }
      counts.All += 1;
      if (toSiteMap.get(record.spoolNo)) {
        counts.Received += 1;
      } else {
        counts.Awaiting += 1;
      }
    }

    return counts;
  }, [laydownRecords, toSiteMap]);

  const setStatus = (status: ToSiteStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "All") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    const query = params.toString();
    router.replace(query ? `/erection/to-site?${query}` : "/erection/to-site", {
      scroll: false,
    });
  };

  const openSpool = (spoolNo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("spool", spoolNo);
    if (activeStatus !== "All" && !params.has("status")) {
      params.set("status", activeStatus);
    }
    router.replace(`/erection/to-site?${params.toString()}`, { scroll: false });
  };

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("spool");
    const query = params.toString();
    router.replace(query ? `/erection/to-site?${query}` : "/erection/to-site", {
      scroll: false,
    });
  };

  const emptyText =
    activeStatus === "Awaiting"
      ? "No spools awaiting site receipt."
      : activeStatus === "Received"
        ? "No spools confirmed from W-24 receipts yet."
        : "No laydown releases are ready for site receipt.";

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[720px] flex-col gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pb-2 pt-6">
        <h1 className="text-lg font-semibold text-slate-900">To Site</h1>
        <p className="text-sm text-slate-500">
          §12.4 — confirm spool receipt at site from the W-24 QC form after area
          supervisor acceptance.
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-3">
        {TO_SITE_STATUSES.map((status) => (
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
                      Released from Laydown
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Receipt status
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      W-24 No
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Area supervisor
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
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-700">
                        {row.releasedToSiteDate} · {row.releasedBy}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            row.status === "Received"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700",
                          )}
                        >
                          {row.status === "Received"
                            ? "Received"
                            : "Awaiting Receipt"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-700">
                        {row.w24FormNo ? (
                          <span className="font-mono">{row.w24FormNo}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-700">
                        {row.receivedBy ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ToSiteDetailPanel
        spoolNo={urlSpool ?? null}
        open={!!urlSpool}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closePanel();
          }
        }}
      />
    </div>
  );
}
