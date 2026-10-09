"use client"

import { useTestPackTranslations } from "@/modules/pressure-test/ui/test-pack-i18n"

import { useState } from "react"

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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Destructive Builder actions used to run through `window.confirm`: unstyled, unthemed, blocking,
 * and — for the move — fired straight off a native `<select>`'s change event, so choosing a value
 * was the same gesture as committing to it.
 */
export function ConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
}) {
  const t = useTestPackTranslations()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("text.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Moving an ISO is a two-part decision — which pack, then yes — so it gets a dialog with a
 * confirm, rather than a per-row dropdown whose change event was the commit.
 */
export function MoveIsoDialog({
  isoNumber,
  destinations,
  open,
  onOpenChange,
  onMove,
}: {
  isoNumber: string
  destinations: ReadonlyArray<{ id: string; label: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (destinationId: string) => void
}) {
  const t = useTestPackTranslations()

  const [destination, setDestination] = useState("")

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDestination("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("text.move")} {isoNumber}</DialogTitle>
          <DialogDescription>

            {t("text.theServerPerformsTheMoveAndRefreshesBoth")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="move-destination">{t("text.destinationTestPack")}</Label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger id="move-destination" className="w-full">
              <SelectValue placeholder={t("text.selectATestPack")} />
            </SelectTrigger>
            <SelectContent>
              {destinations.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {destinations.length === 0 ? (
            <p className="text-muted-foreground text-xs">

              {t("text.thereIsNoOtherOpenTestPackIn")}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>

            {t("text.cancel")}
          </Button>
          <Button disabled={!destination} onClick={() => onMove(destination)}>

            {t("text.moveIso")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A labelled Radix select. The Builder had six raw `<select>` elements before this. */
export function FieldSelect({
  id,
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  placeholder: string
  options: ReadonlyArray<{ id: string; label: string }>
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || options.length === 0}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
