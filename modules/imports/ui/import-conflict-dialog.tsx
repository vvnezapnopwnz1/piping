"use client"

import { useTranslations } from "next-intl"
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
  const t = useTranslations("spooling.conflictDialog")

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { count: conflictCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("overwrite", { count: conflictCount })}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
