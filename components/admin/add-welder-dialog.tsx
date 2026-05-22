"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WPS_LIST } from "@/lib/engineering-references";
import { useAdminStore } from "@/store/admin-store";

const WELDER_CODE_RE = /^WLD-[A-Z0-9]+$/;

export function AddWelderDialog() {
  const [open, setOpen] = useState(false);
  const [welderCode, setWelderCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedWps, setSelectedWps] = useState<string[]>([]);
  const [materials, setMaterials] = useState("");
  const [diameters, setDiameters] = useState("all");
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [codeError, setCodeError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const welders = useAdminStore((s) => s.welderQualifications);
  const addWelderQualification = useAdminStore(
    (s) => s.addWelderQualification,
  );

  const existingCodes = useMemo(
    () => new Set(welders.map((w) => w.welderCode)),
    [welders],
  );

  const reset = () => {
    setWelderCode("");
    setFullName("");
    setSelectedWps([]);
    setMaterials("");
    setDiameters("all");
    setExpiry("");
    setNotes("");
    setCodeError("");
  };

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const validateCode = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setCodeError("Welder code is required");
      return false;
    }
    if (!WELDER_CODE_RE.test(trimmed)) {
      setCodeError("Format: WLD-<digits/letters>, e.g. WLD-101");
      return false;
    }
    if (existingCodes.has(trimmed)) {
      setCodeError("Welder code must be unique");
      return false;
    }
    setCodeError("");
    return true;
  };

  const toggleWps = (code: string) => {
    setSelectedWps((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleAdd = async () => {
    if (!validateCode(welderCode)) return;
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (selectedWps.length === 0) {
      toast.error("Select at least one qualified WPS");
      return;
    }
    if (!expiry) {
      toast.error("Qualification expiry date is required");
      return;
    }
    const materialList = materials
      .split(/[,;\n]/)
      .map((m) => m.trim())
      .filter(Boolean);
    if (materialList.length === 0) {
      toast.error("Qualified materials cannot be empty");
      return;
    }
    const diameterList = diameters
      .split(/[,;\n]/)
      .map((d) => d.trim())
      .filter(Boolean);

    setIsAdding(true);
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
    addWelderQualification({
      welderCode: welderCode.trim(),
      fullName: fullName.trim(),
      qualifiedWPS: selectedWps,
      qualifiedMaterials: materialList,
      qualifiedDiameters: diameterList.length === 0 ? ["all"] : diameterList,
      qualificationExpiresOn: expiry,
      notes: notes.trim() || undefined,
    });
    setIsAdding(false);
    toast.success(`Welder ${welderCode.trim()} added`);
    setOpen(false);
    reset();
  };

  const activeWps = WPS_LIST.filter((w) => w.status === "Active");

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add Welder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Welder Qualification</DialogTitle>
          <DialogDescription>
            Register a welder with their qualified WPS, materials and expiry.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="wld-code">Welder Code</Label>
              <Input
                id="wld-code"
                value={welderCode}
                onChange={(e) => {
                  setWelderCode(e.target.value.toUpperCase());
                  if (codeError) validateCode(e.target.value);
                }}
                onBlur={() => validateCode(welderCode)}
                placeholder="WLD-101"
                className={codeError ? "border-red-500" : ""}
              />
              {codeError && (
                <p className="text-xs text-red-500">{codeError}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wld-name">Full Name</Label>
              <Input
                id="wld-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Welder full name"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Qualified WPS ({selectedWps.length})</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {activeWps.map((w) => (
                  <label
                    key={w.code}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedWps.includes(w.code)}
                      onCheckedChange={() => toggleWps(w.code)}
                    />
                    <span className="font-mono text-slate-700">{w.code}</span>
                    <span className="text-slate-500 truncate">
                      {w.baseMaterial}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="wld-materials">Qualified Materials</Label>
            <Input
              id="wld-materials"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="CS A106B, SS 316L"
            />
            <p className="text-[11px] text-slate-500">
              Comma-separated material codes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="wld-diameters">Qualified Diameters</Label>
              <Input
                id="wld-diameters"
                value={diameters}
                onChange={(e) => setDiameters(e.target.value)}
                placeholder='all or 2", 3", 4"'
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wld-expiry">Expiry Date</Label>
              <Input
                id="wld-expiry"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="wld-notes">Notes (optional)</Label>
            <Textarea
              id="wld-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Trainee — restricted to small-diameter carbon steel."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isAdding || !welderCode.trim() || !fullName.trim()}
          >
            {isAdding ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding…
              </span>
            ) : (
              "Add Welder"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
