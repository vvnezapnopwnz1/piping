"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ImportConflictDialog({
  open,
  conflictCount,
  onCancel,
  onConfirm,
}: {
  open: boolean
  conflictCount: number
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm overwrite</AlertDialogTitle>
          <AlertDialogDescription>
            {conflictCount} row{conflictCount === 1 ? "" : "s"} in this file already exist in the
            project. Applying the import replaces the stored values with the values from the
            spreadsheet. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep existing values</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Overwrite {conflictCount} rows</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
