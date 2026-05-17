"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  useQCReleaseStore,
  useNotificationsStore,
  useSpoolStages,
} from "@/store";
import {
  QC_CHECKLIST,
  QC_INSPECTORS,
  STAGE_COLOR,
  type QCChecklistEntry,
  type QCChecklistKey,
  type QCChecklistStatus,
  type QCReleaseRecord,
} from "@/lib/spool-data";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface QCReleaseDetailPanelProps {
  spoolNo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: QCChecklistStatus[] = [
  "Pending",
  "Pass",
  "Pass with remark",
];

function StatusSegmented({
  value,
  onChange,
}: {
  value: QCChecklistStatus;
  onChange: (v: QCChecklistStatus) => void;
}) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      {STATUS_OPTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            "px-2 py-1 text-[10px] font-medium transition-colors",
            value === s
              ? "bg-sky-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {s === "Pass with remark" ? "Remark" : s}
        </button>
      ))}
    </div>
  );
}

function buildEmptyRecord(spoolNo: string): QCReleaseRecord {
  return {
    spoolNo,
    entries: QC_CHECKLIST.map((item) => ({
      key: item.key,
      status: "Pending",
    })),
  };
}

export function QCReleaseDetailPanel({
  spoolNo,
  open,
  onOpenChange,
}: QCReleaseDetailPanelProps) {
  const router = useRouter();
  const storeRecord = useQCReleaseStore((s) =>
    spoolNo ? s.getRecord(spoolNo) : undefined,
  );
  const stages = useSpoolStages();
  const stage = spoolNo
    ? (stages.get(spoolNo) ?? "Not Started")
    : "Not Started";

  const [form, setForm] = useState<QCReleaseRecord | null>(null);
  const [inspector, setInspector] = useState<string>(QC_INSPECTORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (storeRecord) {
      setForm(JSON.parse(JSON.stringify(storeRecord)));
      setInspector(storeRecord.inspector ?? QC_INSPECTORS[0]);
    } else if (spoolNo) {
      setForm(buildEmptyRecord(spoolNo));
      setInspector(QC_INSPECTORS[0]);
    } else {
      setForm(null);
    }
  }, [storeRecord, spoolNo]);

  const colors = STAGE_COLOR[stage];

  const validation = useMemo(() => {
    if (!form) return { ok: false, message: "" };
    const pendingCount = form.entries.filter((e) => e.status === "Pending").length;
    const emptyRemark = form.entries.some(
      (e) => e.status === "Pass with remark" && !e.remark?.trim(),
    );
    if (pendingCount > 0) {
      return {
        ok: false,
        message: "Resolve all checklist items before sign-off.",
      };
    }
    if (emptyRemark) {
      return {
        ok: false,
        message: "Add a remark for every Pass-with-remark entry.",
      };
    }
    return { ok: true, message: "" };
  }, [form]);

  if (!spoolNo || !form) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[640px]">
          <p className="text-sm text-slate-500 mt-8">
            Select a spool to view details
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  const pendingCount = form.entries.filter((e) => e.status === "Pending").length;
  const passedCount = form.entries.filter(
    (e) => e.status === "Pass" || e.status === "Pass with remark",
  ).length;
  const remarkCount = form.entries.filter((e) => e.status === "Pass with remark").length;

  const updateEntry = (key: QCChecklistKey, patch: Partial<QCChecklistEntry>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const entries = prev.entries.map((e) =>
        e.key === key ? { ...e, ...patch } : e
      );
      return { ...prev, entries };
    });
  };

  const handleSaveDraft = async () => {
    if (!form) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    const upsertEntryAction = useQCReleaseStore.getState().upsertEntry;
    for (const entry of form.entries) {
      upsertEntryAction(form.spoolNo, entry.key, {
        status: entry.status,
        remark: entry.remark,
      });
    }
    setIsSaving(false);
    toast.success("Draft saved");
  };

  const handleSignOff = async () => {
    if (!form || !validation.ok) return;
    setIsSigning(true);
    await new Promise((r) => setTimeout(r, 700));

    const upsertEntryAction = useQCReleaseStore.getState().upsertEntry;
    for (const entry of form.entries) {
      upsertEntryAction(form.spoolNo, entry.key, {
        status: entry.status,
        remark: entry.remark,
      });
    }

    useQCReleaseStore.getState().signOffQCRelease(form.spoolNo, inspector);

    setIsSigning(false);
    onOpenChange(false);

    toast.success(`QC Release signed for ${form.spoolNo}`);

    const pushNotification = useNotificationsStore.getState().pushNotification;
    pushNotification({
      severity: "info",
      category: "weld_progress",
      title: `${form.spoolNo}: QC Release complete`,
      description: `Advanced to Released by ${inspector}`,
      href: "/fabrication/qc-release",
    });

    router.replace("/fabrication/qc-release?status=Awaiting");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px] flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0 pb-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="font-mono text-base">{spoolNo}</SheetTitle>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                colors.bg,
                colors.text,
                "border-current/20",
              )}
            >
              {stage}
            </span>
          </div>
          <SheetDescription>
            {pendingCount} pending · {passedCount} passed
            {remarkCount > 0 ? ` · ${remarkCount} with remark` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-auto py-4 space-y-4">
          {QC_CHECKLIST.map((item) => {
            const entry = form.entries.find((e) => e.key === item.key)!;
            return (
              <div key={item.key} className="space-y-2 px-1">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.description}
                  </div>
                </div>
                <StatusSegmented
                  value={entry.status}
                  onChange={(v) =>
                    updateEntry(item.key, {
                      status: v,
                      remark: v === "Pass with remark" ? entry.remark : undefined,
                    })
                  }
                />
                {entry.status === "Pass with remark" && (
                  <div className="space-y-1">
                    <Textarea
                      placeholder="Enter remark…"
                      className="text-xs min-h-[60px]"
                      value={entry.remark ?? ""}
                      onChange={(e) =>
                        updateEntry(item.key, { remark: e.target.value })
                      }
                    />
                    <p className="text-[10px] text-slate-500">
                      Remark visible in audit trail
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <SheetFooter className="shrink-0 flex-col gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-600 shrink-0">Inspector</Label>
            <Select value={inspector} onValueChange={setInspector}>
              <SelectTrigger className="h-8 text-xs w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QC_INSPECTORS.map((i) => (
                  <SelectItem key={i} value={i} className="text-xs">
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!validation.ok && (
            <p className="text-xs text-red-600">{validation.message}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || isSigning}
            >
              {isSaving ? "Saving…" : "Save draft"}
            </Button>
            <Button
              size="sm"
              onClick={handleSignOff}
              disabled={!validation.ok || isSaving || isSigning}
            >
              {isSigning ? "Signing…" : "Sign off"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
