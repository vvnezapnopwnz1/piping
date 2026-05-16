"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBatchesStore,
  useWeldsStore,
  useSubcontractors,
  type NdeBatch,
  type NdeMethod,
  type NdeBatchSource,
} from "@/store";
import type { WeldJoint } from "@/lib/weld-data";
import { cn } from "@/lib/utils";

interface CreateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (batch: NdeBatch) => void;
  source?: NdeBatchSource;
  preselectedWeldIds?: string[];
  defaultMethod?: NdeMethod;
}

const METHODS: NdeMethod[] = ["RT", "UT", "MT", "PT", "PMI", "HT"];

const defaultMatrixByMethod: Record<NdeMethod, string> = {
  RT: "NDE-M-CS-A106B",
  UT: "NDE-M-SS-316L",
  MT: "NDE-M-CS-A106B",
  PT: "NDE-M-SS-316L",
  PMI: "NDE-M-CS-A106B",
  HT: "NDE-M-CS-A335-P91",
};

export function CreateBatchDialog({
  open,
  onOpenChange,
  onCreated,
  source = "shop",
  preselectedWeldIds = [],
  defaultMethod,
}: CreateBatchDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const [method, setMethod] = useState<NdeMethod>(defaultMethod ?? "RT");
  const [subcontractor, setSubcontractor] = useState<string>("");
  const [matrixRef, setMatrixRef] = useState<string>(
    defaultMethod
      ? defaultMatrixByMethod[defaultMethod]
      : defaultMatrixByMethod.RT,
  );
  const [inspector, setInspector] = useState<string>("NDE-INS-04");
  const [createdBy, setCreatedBy] = useState<string>("QC-ENG-01");

  const [showRework, setShowRework] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(preselectedWeldIds),
  );
  const [preselectWarning, setPreselectWarning] = useState<string>("");

  const allWelds = useWeldsStore((s) => s.welds);
  const batches = useBatchesStore((s) => s.batches);
  const createBatch = useBatchesStore((s) => s.createBatch);
  const subcontractors = useSubcontractors();

  const activeNdeSubs = useMemo(
    () => subcontractors.filter((s) => s.active && s.scope.includes("nde")),
    [subcontractors],
  );

  useEffect(() => {
    if (activeNdeSubs.length > 0 && !subcontractor) {
      setSubcontractor(activeNdeSubs[0].name);
    }
  }, [activeNdeSubs, subcontractor]);

  useEffect(() => {
    if (!open) return;

    const initialMethod = defaultMethod ?? "RT";
    setMethod(initialMethod);
    setMatrixRef(defaultMatrixByMethod[initialMethod]);
    setSubcontractor(activeNdeSubs.length > 0 ? activeNdeSubs[0].name : "");
    setInspector("NDE-INS-04");
    setCreatedBy("QC-ENG-01");
    setShowRework(false);
    setSearch("");
    setPreselectWarning("");

    const alreadyBatched = new Set<string>();
    let blockedBatchNo = "";
    for (const batch of batches) {
      if (batch.status !== "Closed") {
        for (const weld of batch.welds) {
          alreadyBatched.add(weld.id);
          blockedBatchNo = batch.batchNo;
        }
      }
    }

    const cleanIds = preselectedWeldIds.filter((id) => !alreadyBatched.has(id));
    const droppedCount = preselectedWeldIds.length - cleanIds.length;
    if (droppedCount > 0 && blockedBatchNo) {
      setPreselectWarning(
        `${droppedCount} of the preselected welds are already in batch ${blockedBatchNo} and were unselected.`,
      );
    }

    setSelectedIds(new Set(cleanIds));
    setStep(cleanIds.length > 0 ? 2 : 1);
  }, [open, preselectedWeldIds, defaultMethod, activeNdeSubs, batches]);

  const weldsInNonClosedBatches = useMemo(() => {
    const ids = new Set<string>();
    for (const batch of batches) {
      if (batch.status !== "Closed") {
        for (const weld of batch.welds) {
          ids.add(weld.id);
        }
      }
    }
    return ids;
  }, [batches]);

  const filteredWelds = useMemo(() => {
    const targetStatus = showRework ? "Rework" : "Completed";
    const q = search.trim().toLowerCase();

    return allWelds.filter((w) => {
      if (w.status !== targetStatus) return false;
      if (weldsInNonClosedBatches.has(w.id)) return false;
      if (!q) return true;
      return (
        w.jointNo.toLowerCase().includes(q) ||
        w.spoolNo.toLowerCase().includes(q) ||
        w.isoNo.toLowerCase().includes(q)
      );
    });
  }, [allWelds, showRework, weldsInNonClosedBatches, search]);

  const allVisibleSelected =
    filteredWelds.length > 0 &&
    filteredWelds.every((w) => selectedIds.has(w.id));

  const someVisibleSelected =
    filteredWelds.some((w) => selectedIds.has(w.id)) && !allVisibleSelected;

  const selectedWelds = useMemo(
    () => allWelds.filter((w) => selectedIds.has(w.id)),
    [allWelds, selectedIds],
  );

  const canProceed = method && subcontractor && matrixRef.trim().length > 0;

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const w of filteredWelds) {
          next.delete(w.id);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const w of filteredWelds) {
          next.add(w.id);
        }
        return next;
      });
    }
  };

  const handleToggleWeld = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMethodChange = (val: NdeMethod) => {
    setMethod(val);
    setMatrixRef(defaultMatrixByMethod[val]);
  };

  const handleReset = () => {
    setStep(1);
    setMethod(defaultMethod ?? "RT");
    setSubcontractor(activeNdeSubs.length > 0 ? activeNdeSubs[0].name : "");
    setMatrixRef(
      defaultMethod
        ? defaultMatrixByMethod[defaultMethod]
        : defaultMatrixByMethod.RT,
    );
    setInspector("NDE-INS-04");
    setCreatedBy("QC-ENG-01");
    setShowRework(false);
    setSearch("");
    setSelectedIds(new Set(preselectedWeldIds));
    setPreselectWarning("");
  };

  const handleCreate = async () => {
    if (selectedWelds.length === 0) return;

    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

    const newBatch = createBatch({
      method,
      subcontractor,
      matrixRef,
      createdBy: createdBy || undefined,
      source,
      welds: selectedWelds.map((w) => ({
        id: w.id,
        jointNo: w.jointNo,
        spoolNo: w.spoolNo,
        isoNo: w.isoNo,
        welder: w.welderCode,
        inspector: inspector || undefined,
        dwirNo: w.dwirNo ?? `DWIR-${Date.now().toString().slice(-4)}`,
        materialType: w.materialType ?? "CS A106B",
        diaInch: w.diaInch ?? '6"',
        wpsNo: w.wpsNo ?? "GTAW-P1-1G",
      })),
    });

    onCreated(newBatch);
    onOpenChange(false);
    handleReset();
  };

  const statusBadgeClasses: Record<string, string> = {
    Completed: "border-emerald-300 bg-emerald-100 text-emerald-800",
    Rework: "border-amber-300 bg-amber-100 text-amber-800",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleReset();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[780px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b">
          <DialogTitle>Create new NDE batch</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Step 1 of 2 — Enter batch metadata"
              : `Step 2 of 2 — Select welds (${selectedWelds.length} selected)`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="px-6 py-5 space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">NDE method</Label>
              <RadioGroup
                value={method}
                onValueChange={(v) => handleMethodChange(v as NdeMethod)}
                className="flex flex-wrap gap-3"
              >
                {METHODS.map((m) => (
                  <div key={m} className="flex items-center space-x-2">
                    <RadioGroupItem value={m} id={`method-${m}`} />
                    <Label
                      htmlFor={`method-${m}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {m}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcontractor" className="text-sm font-medium">
                Subcontractor
              </Label>
              <Select value={subcontractor} onValueChange={setSubcontractor}>
                <SelectTrigger id="subcontractor">
                  <SelectValue placeholder="Select subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  {activeNdeSubs.map((s) => (
                    <SelectItem key={s.code} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matrixRef" className="text-sm font-medium">
                Matrix ref
              </Label>
              <Input
                id="matrixRef"
                value={matrixRef}
                onChange={(e) => setMatrixRef(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inspector" className="text-sm font-medium">
                  Inspector
                </Label>
                <Input
                  id="inspector"
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  placeholder="NDE-INS-04"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createdBy" className="text-sm font-medium">
                  Created by
                </Label>
                <Input
                  id="createdBy"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  placeholder="QC-ENG-01"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {preselectWarning && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                {preselectWarning}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search joint, spool, ISO..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  id="show-rework"
                  checked={showRework}
                  onCheckedChange={setShowRework}
                />
                <Label
                  htmlFor="show-rework"
                  className="text-sm font-normal cursor-pointer"
                >
                  Show Rework welds
                </Label>
              </div>
            </div>

            <div className="rounded-md border max-h-[320px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 px-3">
                      <Checkbox
                        checked={
                          allVisibleSelected
                            ? true
                            : someVisibleSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={handleToggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="text-xs">Joint</TableHead>
                    <TableHead className="text-xs">Spool</TableHead>
                    <TableHead className="text-xs">ISO</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Welder</TableHead>
                    <TableHead className="text-xs">WPS</TableHead>
                    <TableHead className="text-xs">Dia</TableHead>
                    <TableHead className="text-xs">Material</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWelds.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No welds match. Try clearing filters or check Show
                        Rework welds.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWelds.map((w) => (
                      <TableRow
                        key={w.id}
                        className={cn(selectedIds.has(w.id) && "bg-slate-50")}
                      >
                        <TableCell className="px-3">
                          <Checkbox
                            checked={selectedIds.has(w.id)}
                            onCheckedChange={() => handleToggleWeld(w.id)}
                            aria-label={`Select ${w.jointNo}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {w.jointNo}
                        </TableCell>
                        <TableCell className="text-xs">{w.spoolNo}</TableCell>
                        <TableCell className="text-xs">{w.isoNo}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                              statusBadgeClasses[w.status] ??
                                "border-slate-300 bg-slate-100 text-slate-700",
                            )}
                          >
                            {w.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {w.welderCode}
                        </TableCell>
                        <TableCell className="text-xs">{w.wpsNo}</TableCell>
                        <TableCell className="text-xs">{w.diaInch}</TableCell>
                        <TableCell className="text-xs">
                          {w.materialType}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t gap-2">
          {step === 2 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="mr-auto"
            >
              Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              handleReset();
            }}
          >
            Cancel
          </Button>
          {step === 1 ? (
            <Button disabled={!canProceed} onClick={() => setStep(2)}>
              Next
            </Button>
          ) : (
            <Button
              disabled={selectedWelds.length === 0}
              onClick={handleCreate}
            >
              Create batch ({selectedWelds.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
