"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Lock, Save, Scan, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { useBatchesStore, useErectionStore } from "@/store";
import { determineNDEMethods } from "@/lib/welder-qualifications";

import { StatusBadge } from "@/components/status-badge";
import { ErectionStatusBadge } from "./erection-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { validateWelder } from "@/lib/welder-qualifications";
import type { FieldWeldJoint, ErectionStatus } from "@/lib/erection-weld-data";
import {
  ERECTION_STATUS_OPTIONS,
  FIELD_WELDERS,
} from "@/lib/erection-weld-data";

type WeldStatus = FieldWeldJoint["status"];

interface FieldWeldDetailPanelProps {
  selectedId: string | null;
  onClose: () => void;
}

const WELD_STATUSES: WeldStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Rejected",
  "Rework",
  "On Hold",
];

const INSPECTORS = [
  "ENG-01",
  "ENG-02",
  "ENG-03",
  "ENG-04",
  "ENG-05",
  "ENG-06",
  "ENG-07",
];

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function toDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FieldRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ReadOnlyField({ value }: { value: string }) {
  return (
    <div className="h-8 px-3 flex items-center rounded border border-slate-200 bg-slate-50 text-xs text-slate-700 font-mono">
      {value || "—"}
    </div>
  );
}

export function FieldWeldDetailPanel({
  selectedId,
  onClose,
}: FieldWeldDetailPanelProps) {
  const router = useRouter();
  const createBatch = useBatchesStore((s) => s.createBatch);
  const weld = useErectionStore((s) =>
    s.fieldWelds.find((w) => w.id === selectedId),
  );
  const [form, setForm] = useState<FieldWeldJoint | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (weld) {
      setForm({ ...weld });
      setSaved(false);
    }
  }, [selectedId]);

  if (!weld || !form) {
    return (
      <aside className="w-[360px] rounded-xl border bg-white flex flex-col items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500">
            Select a weld joint to view or edit its details
          </p>
        </div>
      </aside>
    );
  }

  const isLocked = form.isLocked;
  const isRejected = form.status === "Rejected";

  const validation = validateWelder(
    form.welderCode,
    form.wpsNo,
    form.materialType,
    form.diaInch,
  );

  const rootCapSum = form.rootPercent + form.capPercent;
  const rootCapValid = rootCapSum === 100;
  const showRootCapError =
    !rootCapValid && (form.rootPercent > 0 || form.capPercent > 0);

  const update = (
    field: keyof FieldWeldJoint,
    value: string | boolean | number,
  ) => {
    setForm((prev: FieldWeldJoint | null) =>
      prev ? { ...prev, [field]: value } : prev,
    );
    setSaved(false);
  };

  const handleSave = () => {
    if (form && !isLocked) {
      useErectionStore.getState().updateFieldWeld(form.id, { ...form });
      setSaved(true);
      toast.success("Changes saved");
    }
  };

  const handleSendToNDE = async () => {
    if (!weld) return;
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 800));
    const { primary } = determineNDEMethods(weld);
    const batch = createBatch({
      method: primary,
      welds: [
        {
          id: weld.id,
          jointNo: weld.jointNo,
          spoolNo: weld.spoolNo,
          isoNo: weld.isoNo,
          diaInch: weld.diaInch,
          welder: weld.welderCode,
          dwirNo: weld.dwirNo,
          materialType: weld.materialType,
          wpsNo: weld.wpsNo,
        },
      ],
      createdBy: "QC-ENG-01",
      matrixRef: `NDE-M-${weld.materialType.replace(/\s/g, "")}`,
    });
    setIsSending(false);
    toast.success(`Batch ${batch.batchNo} created`, {
      description: `${primary} examination · ${weld.jointNo} (${weld.diaInch} ${weld.materialType})`,
      action: {
        label: "View in NDE",
        onClick: () => router.push(`/nde?batch=${batch.id}`),
      },
      duration: 5000,
    });
    onClose();
  };

  const handleDateChange =
    (field: keyof FieldWeldJoint) => (event: ChangeEvent<HTMLInputElement>) => {
      update(field, toDisplayDate(event.target.value));
    };

  return (
    <aside className="w-[360px] flex-shrink-0 rounded-xl border border-slate-200 bg-white flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 font-mono">
              {form.jointNo}
            </span>
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-300">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">{form.spoolNo}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={form.status} />
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLocked && (
        <div className="mx-4 mt-3 px-3 py-2 rounded border border-slate-300 bg-slate-100 flex items-center gap-2 flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          <p className="text-xs text-slate-600">
            This weld has been progressed and is locked for editing.
          </p>
        </div>
      )}
      {isRejected && !isLocked && (
        <div className="mx-4 mt-3 px-3 py-2 rounded border border-red-300 bg-red-100 flex items-center gap-2 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-red-700 flex-shrink-0" />
          <p className="text-xs text-red-700">
            Weld rejected. Update status after repair disposition.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            Joint Information
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Joint No">
                <ReadOnlyField value={form.jointNo} />
              </FieldRow>
              <FieldRow label="ISO No">
                <ReadOnlyField value={form.isoNo} />
              </FieldRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Spool No">
                <ReadOnlyField value={form.spoolNo} />
              </FieldRow>
              <FieldRow label="Dia-inch">
                <ReadOnlyField value={form.diaInch} />
              </FieldRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Material Type">
                <ReadOnlyField value={form.materialType} />
              </FieldRow>
              <FieldRow label="WPS No">
                <ReadOnlyField value={form.wpsNo} />
              </FieldRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Heat No">
                {isLocked ? (
                  <ReadOnlyField value={form.heatNo || "—"} />
                ) : (
                  <Input
                    value={form.heatNo || ""}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      update("heatNo", event.target.value)
                    }
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs font-mono"
                    placeholder="HT-XXXX"
                  />
                )}
              </FieldRow>
            </div>
            <FieldRow label="DWIR No">
              <ReadOnlyField value={form.dwirNo} />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Area Zone">
                <ReadOnlyField value={form.areaZone} />
              </FieldRow>
              <FieldRow label="Joint Type">
                <ReadOnlyField value={form.fieldJointType} />
              </FieldRow>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            Welding Details
          </p>
          <div className="flex flex-col gap-3">
            <FieldRow label="Welder Code">
              {isLocked ? (
                <ReadOnlyField value={form.welderCode} />
              ) : (
                <Select
                  value={form.welderCode}
                  onValueChange={(value: string) => update("welderCode", value)}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    {FIELD_WELDERS.map((welder) => (
                      <SelectItem
                        key={welder}
                        value={welder}
                        className="text-slate-900 focus:bg-slate-100 text-xs font-mono"
                      >
                        {welder}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!validation.isValid && form.welderCode && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{validation.message}</span>
                </div>
              )}
            </FieldRow>

            <FieldRow label="Weld Date">
              {isLocked ? (
                <ReadOnlyField value={form.weldDate} />
              ) : (
                <Input
                  type="date"
                  value={formatDate(form.weldDate)}
                  onChange={handleDateChange("weldDate")}
                  className="h-8 bg-white border-slate-300 text-slate-900 text-xs [color-scheme:light]"
                />
              )}
            </FieldRow>

            <FieldRow label="Status">
              {isLocked ? (
                <div className="h-8 px-3 flex items-center">
                  <StatusBadge status={form.status} />
                </div>
              ) : (
                <Select
                  value={form.status}
                  onValueChange={(value: string) =>
                    update("status", value as WeldStatus)
                  }
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    {WELD_STATUSES.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className="text-slate-900 focus:bg-slate-100 text-xs"
                      >
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldRow>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            Erection Progress
          </p>
          <div className="flex flex-col gap-3">
            <FieldRow label="Erection Status">
              {isLocked ? (
                <div className="h-8 px-3 flex items-center">
                  <ErectionStatusBadge status={form.erectionStatus} />
                </div>
              ) : (
                <Select
                  value={form.erectionStatus}
                  onValueChange={(value: string) =>
                    update("erectionStatus", value as ErectionStatus)
                  }
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    {ERECTION_STATUS_OPTIONS.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className="text-slate-900 focus:bg-slate-100 text-xs"
                      >
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldRow>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Root %">
                {isLocked ? (
                  <ReadOnlyField value={`${form.rootPercent}%`} />
                ) : (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.rootPercent}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const val =
                        event.target.value === ""
                          ? 0
                          : Number(event.target.value);
                      update("rootPercent", val);
                    }}
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs font-mono"
                  />
                )}
              </FieldRow>
              <FieldRow label="Cap %">
                {isLocked ? (
                  <ReadOnlyField value={`${form.capPercent}%`} />
                ) : (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.capPercent}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const val =
                        event.target.value === ""
                          ? 0
                          : Number(event.target.value);
                      update("capPercent", val);
                    }}
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs font-mono"
                  />
                )}
              </FieldRow>
            </div>

            {showRootCapError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Root % + Cap % must equal 100</span>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="foreman-confirmed"
                checked={!!form.foremanConfirmed}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  update("foremanConfirmed", event.target.checked)
                }
                disabled={isLocked}
                className="w-4 h-4 rounded border-slate-300 bg-white accent-sky-600 cursor-pointer disabled:cursor-not-allowed"
              />
              <label
                htmlFor="foreman-confirmed"
                className={cn(
                  "text-xs select-none",
                  isLocked
                    ? "text-slate-500 cursor-not-allowed"
                    : "text-slate-700 cursor-pointer",
                )}
              >
                Foreman confirmed
              </label>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            Fit-Up Inspection
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Inspector">
                {isLocked ? (
                  <ReadOnlyField value={form.fitUpInspector || "—"} />
                ) : (
                  <Select
                    value={form.fitUpInspector || ""}
                    onValueChange={(value: string) =>
                      update("fitUpInspector", value)
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {INSPECTORS.map((inspector) => (
                        <SelectItem
                          key={inspector}
                          value={inspector}
                          className="text-slate-900 focus:bg-slate-100 text-xs font-mono"
                        >
                          {inspector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldRow>
              <FieldRow label="Fit-Up Date">
                {isLocked ? (
                  <ReadOnlyField value={form.fitUpDate || "—"} />
                ) : (
                  <Input
                    type="date"
                    value={formatDate(form.fitUpDate || "")}
                    onChange={handleDateChange("fitUpDate")}
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs [color-scheme:light]"
                  />
                )}
              </FieldRow>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            NDE / RT
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="RT Report No">
                {isLocked ? (
                  <ReadOnlyField value={form.rtNo || "—"} />
                ) : (
                  <Input
                    value={form.rtNo || ""}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      update("rtNo", event.target.value)
                    }
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs font-mono"
                    placeholder="RT-YYYY-XXXX"
                  />
                )}
              </FieldRow>
              <FieldRow label="RT Result">
                {isLocked ? (
                  <ReadOnlyField value={form.rtResult || "—"} />
                ) : (
                  <Select
                    value={form.rtResult || ""}
                    onValueChange={(value: string) => update("rtResult", value)}
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      <SelectItem
                        value="Accepted"
                        className="text-emerald-700 focus:bg-slate-100 text-xs"
                      >
                        Accepted
                      </SelectItem>
                      <SelectItem
                        value="Rejected"
                        className="text-red-700 focus:bg-slate-100 text-xs"
                      >
                        Rejected
                      </SelectItem>
                      <SelectItem
                        value="Pending"
                        className="text-amber-700 focus:bg-slate-100 text-xs"
                      >
                        Pending
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FieldRow>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="pwht"
                checked={!!form.pwhtRequired}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  update("pwhtRequired", event.target.checked)
                }
                disabled={isLocked}
                className="w-4 h-4 rounded border-slate-300 bg-white accent-sky-600 cursor-pointer disabled:cursor-not-allowed"
              />
              <label
                htmlFor="pwht"
                className={cn(
                  "text-xs select-none",
                  isLocked
                    ? "text-slate-500 cursor-not-allowed"
                    : "text-slate-700 cursor-pointer",
                )}
              >
                PWHT Required
              </label>
            </div>

            {form.pwhtRequired && (
              <FieldRow label="PWHT Date">
                {isLocked ? (
                  <ReadOnlyField value={form.pwhtDate || "—"} />
                ) : (
                  <Input
                    type="date"
                    value={formatDate(form.pwhtDate || "")}
                    onChange={handleDateChange("pwhtDate")}
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs [color-scheme:light]"
                  />
                )}
              </FieldRow>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            Remarks
          </p>
          {isLocked ? (
            <div className="px-3 py-2 rounded border border-slate-200 bg-slate-50 text-xs text-slate-700 min-h-[72px]">
              {form.remarks || "—"}
            </div>
          ) : (
            <textarea
              value={form.remarks || ""}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                update("remarks", event.target.value)
              }
              rows={3}
              placeholder="Enter QC notes or disposition…"
              className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-sky-600 placeholder:text-slate-500"
            />
          )}
        </div>
      </div>

      {!isLocked && (
        <div className="px-5 py-4 border-t border-slate-200 flex flex-col gap-3 flex-shrink-0">
          {weld.status === "Completed" && !weld.rtNo && (
            <Button
              variant="outline"
              onClick={handleSendToNDE}
              disabled={isSending}
              className="h-9 text-xs gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              <Scan className="h-4 w-4" />
              {isSending ? "Creating batch..." : "Send to Site NDE"}
            </Button>
          )}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={!validation.isValid || showRootCapError}
              className={cn(
                "flex-1 h-9 text-xs font-medium gap-2",
                saved
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-sky-600 hover:bg-sky-500 text-white",
              )}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
