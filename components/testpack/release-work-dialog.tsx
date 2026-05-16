"use client";

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
  const handleExport = () => {
    const header = "ID,Joint,ISO,Spool,Status\n";
    const rows = items
      .map(
        (r) =>
          `${r.id},${r.jointNo ?? ""},${r.isoNo},${r.spoolNo ?? ""},${r.status}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `release-work-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Work list exported");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {items.length} item{items.length !== 1 ? "s" : ""} outstanding
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
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No outstanding items
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
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
            disabled={items.length === 0}
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
