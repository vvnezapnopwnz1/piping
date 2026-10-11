// modules/project-setup/ui/add-another-toggle.tsx
"use client"

import { useTranslations } from "next-intl"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

/** Keeps an "Add" dialog open after a successful save, so a list is typed in without reopening the form. */
export function AddAnotherToggle({
  id,
  checked,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const t = useTranslations("projectSetup.projectReferential")
  return (
    <div className="flex items-center gap-2 sm:mr-auto">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <Label htmlFor={id} className="text-sm font-normal">
        {t("addAnother")}
      </Label>
    </div>
  )
}
