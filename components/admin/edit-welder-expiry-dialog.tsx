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
import { useAdminStore } from "@/store/admin-store";

interface EditWelderExpiryDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  welderCode: string;
  initialExpiry: string;
  welderName: string;
}

export function EditWelderExpiryDialog({
  open,
  onOpenChange,
  welderCode,
  initialExpiry,
  welderName,
}: EditWelderExpiryDialogProps) {
  const updateWelderExpiry = useAdminStore((s) => s.updateWelderExpiry);
  const [expiry, setExpiry] = useState(initialExpiry);
  const [endorsement, setEndorsement] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setExpiry(initialExpiry);
      setEndorsement("");
    }
  }, [open, initialExpiry]);

  const handleSave = async () => {
    if (!expiry) {
      toast.error("Expiry date is required");
      return;
    }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 200));
    updateWelderExpiry(welderCode, expiry);
    setIsSaving(false);
    toast.success(`Expiry for ${welderCode} updated`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Renew expiry — {welderCode}</DialogTitle>
          <DialogDescription>
            {welderName}. Set the new qualification expiry date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="exp-date">New Expiry Date</Label>
            <Input
              id="exp-date"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="exp-endorsement">Endorsement Reference</Label>
            <Input
              id="exp-endorsement"
              value={endorsement}
              onChange={(e) => setEndorsement(e.target.value)}
              placeholder="e.g. WPQ-2026-REV-3"
            />
            <p className="text-[11px] text-slate-500">
              For audit reference only — not persisted in scope.
            </p>
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
          <Button onClick={handleSave} disabled={isSaving || !expiry}>
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              "Save expiry"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
