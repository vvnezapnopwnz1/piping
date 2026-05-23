"use client";

import * as XLSX from "xlsx";
import { Download } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReleaseWorkItem } from "@/lib/testpack-data";
import { useScopeLock } from "@/lib/scope-lock";
import { usePmWriteLock } from "@/lib/pm-write-lock";

interface ReleaseWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: ReleaseWorkItem[];
}

export function ReleaseWorkDialog({
  open,
  onOpenChange,
  title,
  items,
}: ReleaseWorkDialogProps) {
  const scope = useScopeLock();
  const { locked: pmLocked } = usePmWriteLock();

  const scopedItems = items.filter((row) =>
    scope.isInScope((row as ReleaseWorkItem & { pdsAreaCode?: string }).pdsAreaCode),
  );

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["ID", "Joint", "ISO", "Spool", "Status"],
      ...scopedItems.map((r) => [
        r.id,
        r.jointNo ?? "",
        r.isoNo,
        r.spoolNo ?? "",
        r.status,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Release Work List");
    XLSX.writeFile(
      wb,
      `release-work-${title.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success(`${scopedItems.length} row(s) exported`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {scopedItems.length} item{scopedItems.length !== 1 ? "s" : ""}{" "}
            outstanding
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[320px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Joint / ID</TableHead>
                <TableHead className="text-xs">ISO</TableHead>
                <TableHead className="text-xs">Spool</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scopedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No outstanding items
                  </TableCell>
                </TableRow>
              ) : (
                scopedItems.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.jointNo ?? row.id}
                    </TableCell>
                    <TableCell className="text-xs">{row.isoNo}</TableCell>
                    <TableCell className="text-xs">{row.spoolNo ?? "—"}</TableCell>
                    <TableCell className="text-xs">{row.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="gap-2"
            disabled={pmLocked || scopedItems.length === 0}
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
