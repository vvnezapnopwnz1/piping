"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminStore,
  type NDEMatrixRule,
} from "@/store/admin-store";

const SERVICE_CLASSES: NDEMatrixRule["serviceClass"][] = [
  "Class 1",
  "Class 2",
  "Class 3",
  "Utility",
];
const METHODS: NDEMatrixRule["primaryMethod"][] = [
  "RT",
  "UT",
  "PT",
  "MT",
  "VT",
];

interface NdeMatrixRuleDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  mode: "add" | "edit";
  initial?: NDEMatrixRule;
}

export function NdeMatrixRuleDialog({
  open,
  onOpenChange,
  mode,
  initial,
}: NdeMatrixRuleDialogProps) {
  const addNdeRule = useAdminStore((s) => s.addNdeRule);
  const updateNdeRule = useAdminStore((s) => s.updateNdeRule);

  const [serviceClass, setServiceClass] =
    useState<NDEMatrixRule["serviceClass"]>("Class 1");
  const [diameterRange, setDiameterRange] = useState("");
  const [thicknessRange, setThicknessRange] = useState("");
  const [primaryMethod, setPrimaryMethod] =
    useState<NDEMatrixRule["primaryMethod"]>("RT");
  const [primaryCoverage, setPrimaryCoverage] = useState("100%");
  const [secondaryMethod, setSecondaryMethod] = useState<string>("none");
  const [secondaryCoverage, setSecondaryCoverage] = useState("");
  const [acceptanceCriterion, setAcceptanceCriterion] = useState(
    "ASME B31.3 §341.3.2",
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setServiceClass(initial.serviceClass);
      setDiameterRange(initial.diameterRange);
      setThicknessRange(initial.thicknessRange);
      setPrimaryMethod(initial.primaryMethod);
      setPrimaryCoverage(initial.primaryCoverage);
      setSecondaryMethod(initial.secondaryMethod ?? "none");
      setSecondaryCoverage(initial.secondaryCoverage ?? "");
      setAcceptanceCriterion(initial.acceptanceCriterion);
    } else {
      setServiceClass("Class 1");
      setDiameterRange("");
      setThicknessRange("");
      setPrimaryMethod("RT");
      setPrimaryCoverage("100%");
      setSecondaryMethod("none");
      setSecondaryCoverage("");
      setAcceptanceCriterion("ASME B31.3 §341.3.2");
    }
  }, [open, mode, initial]);

  const handleSave = async () => {
    if (!diameterRange.trim()) {
      toast.error("Diameter range is required");
      return;
    }
    if (!thicknessRange.trim()) {
      toast.error("Thickness range is required");
      return;
    }
    if (!primaryCoverage.trim()) {
      toast.error("Primary coverage is required");
      return;
    }
    if (!acceptanceCriterion.trim()) {
      toast.error("Acceptance criterion is required");
      return;
    }
    const hasSecondary = secondaryMethod !== "none";
    if (hasSecondary && !secondaryCoverage.trim()) {
      toast.error("Secondary coverage is required when secondary method set");
      return;
    }

    const payload: Omit<NDEMatrixRule, "id"> = {
      serviceClass,
      diameterRange: diameterRange.trim(),
      thicknessRange: thicknessRange.trim(),
      primaryMethod,
      primaryCoverage: primaryCoverage.trim(),
      secondaryMethod: hasSecondary
        ? (secondaryMethod as NDEMatrixRule["secondaryMethod"])
        : undefined,
      secondaryCoverage: hasSecondary ? secondaryCoverage.trim() : undefined,
      acceptanceCriterion: acceptanceCriterion.trim(),
    };

    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
    if (mode === "edit" && initial) {
      updateNdeRule(initial.id, payload);
      toast.success(`Rule ${initial.id} updated`);
    } else {
      addNdeRule(payload);
      toast.success("NDE rule added");
    }
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? `Edit rule ${initial?.id}` : "Add NDE rule"}
          </DialogTitle>
          <DialogDescription>
            Service class × diameter × thickness → primary / secondary NDE
            method and coverage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Service Class</Label>
              <Select
                value={serviceClass}
                onValueChange={(v) =>
                  setServiceClass(v as NDEMatrixRule["serviceClass"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="nde-acc">Acceptance Criterion</Label>
              <Input
                id="nde-acc"
                value={acceptanceCriterion}
                onChange={(e) => setAcceptanceCriterion(e.target.value)}
                placeholder="ASME B31.3 §341.3.2"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="nde-dia">Diameter Range</Label>
              <Input
                id="nde-dia"
                value={diameterRange}
                onChange={(e) => setDiameterRange(e.target.value)}
                placeholder="DN 25–50"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="nde-thk">Thickness Range</Label>
              <Input
                id="nde-thk"
                value={thicknessRange}
                onChange={(e) => setThicknessRange(e.target.value)}
                placeholder="≤ 10 mm"
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Primary
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Method</Label>
                <Select
                  value={primaryMethod}
                  onValueChange={(v) =>
                    setPrimaryMethod(v as NDEMatrixRule["primaryMethod"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nde-pcov">Coverage</Label>
                <Input
                  id="nde-pcov"
                  value={primaryCoverage}
                  onChange={(e) => setPrimaryCoverage(e.target.value)}
                  placeholder="100%"
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Secondary (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Method</Label>
                <Select
                  value={secondaryMethod}
                  onValueChange={setSecondaryMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nde-scov">Coverage</Label>
                <Input
                  id="nde-scov"
                  value={secondaryCoverage}
                  onChange={(e) => setSecondaryCoverage(e.target.value)}
                  placeholder="100%"
                  disabled={secondaryMethod === "none"}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : mode === "edit" ? (
              "Save changes"
            ) : (
              "Add rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
