"use client";

import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";

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
import type { FlangeJoint } from "@/lib/flange-data";

interface FlangeDetailPanelProps {
  joint: FlangeJoint | null;
  onClose: () => void;
  onSave: (updated: FlangeJoint) => void;
}

const JOINERS = ["JTR-02", "JTR-03", "JTR-05", "JTR-07", "JTR-09"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnly({ value }: { value: string | number }) {
  return (
    <div className="flex h-8 items-center rounded border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-700">
      {value || "—"}
    </div>
  );
}

export function FlangeDetailPanel({
  joint,
  onClose,
  onSave,
}: FlangeDetailPanelProps) {
  const [form, setForm] = useState<FlangeJoint | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (joint) setForm({ ...joint });
  }, [joint]);

  if (!joint || !form) {
    return (
      <aside className="flex w-[360px] flex-col items-center justify-center rounded-xl border bg-white">
        <p className="px-8 text-center text-sm text-slate-500">
          Select a flange joint to view torque and bolting details
        </p>
      </aside>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));
    const updated: FlangeJoint = {
      ...form,
      boltingStatus:
        form.jointer && form.jointDate
          ? "Torque Verified"
          : form.boltingStatus === "Not Started"
            ? "Bolted"
            : form.boltingStatus,
      testpackId: form.testpackId ?? form.testPackId,
      category: form.category ?? form.jointCategory,
      reportNo: form.reportNo ?? form.reportNbr,
      tagNo: form.tagNo ?? form.tagNbr,
    };
    onSave(updated);
    setSaving(false);
    toast.success(`Torque record saved for ${form.btNo}`);
  };

  return (
    <aside className="flex w-[360px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-900">
            {form.btNo}
          </p>
          <p className="text-xs text-muted-foreground">{form.isoNo}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Field label="Test pack">
          <ReadOnly value={form.testPackId} />
        </Field>
        <Field label="Line / Rev / Sheet">
          <ReadOnly value={`${form.lineNo} · ${form.rev} · ${form.sheetNo}`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Diam (in)">
            <ReadOnly value={form.diamInch} />
          </Field>
          <Field label="Rating">
            <ReadOnly value={form.rating} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Bolt size">
            <ReadOnly value={form.boltSize} />
          </Field>
          <Field label="Qty">
            <ReadOnly value={form.boltQty} />
          </Field>
          <Field label="Length">
            <ReadOnly value={form.boltLength} />
          </Field>
        </div>
        <Field label="Joint period / Category">
          <ReadOnly value={`${form.jointPeriod} · Cat ${form.jointCategory}`} />
        </Field>
        <Field label="Jointing method">
          <ReadOnly value={form.jointingMethod} />
        </Field>
        <Field label="Torque value (N·m)">
          <Input
            type="number"
            value={form.jointingValue}
            onChange={(e) =>
              setForm((prev) =>
                prev
                  ? { ...prev, jointingValue: Number(e.target.value) || 0 }
                  : prev,
              )
            }
            className="h-8 font-mono text-xs"
          />
        </Field>
        <Field label="Jointer">
          <Select
            value={form.jointer ?? ""}
            onValueChange={(v) =>
              setForm((prev) => (prev ? { ...prev, jointer: v } : prev))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select jointer" />
            </SelectTrigger>
            <SelectContent>
              {JOINERS.map((j) => (
                <SelectItem key={j} value={j}>
                  {j}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Joint date">
          <Input
            type="date"
            value={form.jointDate ?? ""}
            onChange={(e) =>
              setForm((prev) =>
                prev ? { ...prev, jointDate: e.target.value } : prev,
              )
            }
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Report / Tag">
          <ReadOnly
            value={`${form.reportNbr ?? "—"} / ${form.tagNbr ?? "—"}`}
          />
        </Field>
        {form.ut != null && (
          <Field label="UT (equiv.)">
            <ReadOnly value={form.ut} />
          </Field>
        )}
      </div>

      <div className="border-t border-slate-200 p-4">
        <Button className="w-full gap-2" disabled={saving} onClick={handleSave}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save torque record"}
        </Button>
      </div>
    </aside>
  );
}
