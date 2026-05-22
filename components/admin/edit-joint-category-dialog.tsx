"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"
import {
  useAdminStore,
  type JointCategoryRecord,
} from "@/store/admin-store"

interface EditJointCategoryDialogProps {
  category: JointCategoryRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditJointCategoryDialog({
  category,
  open,
  onOpenChange,
}: EditJointCategoryDialogProps) {
  const updateJointCategory = useAdminStore((s) => s.updateJointCategory)

  const [description, setDescription] = useState("")
  const [examplesText, setExamplesText] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!category) return
    setDescription(category.description)
    setExamplesText(category.examples.join("\n"))
  }, [category])

  const handleSave = async () => {
    if (!category) return
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    const examples = examplesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    updateJointCategory(category.code, {
      description: description.trim(),
      examples: examples.length > 0 ? examples : category.examples,
    })
    toast.success(`Category ${category.code} updated`)
    setIsSaving(false)
    onOpenChange(false)
  }

  if (!category) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Category {category.code}</DialogTitle>
          <DialogDescription>
            Update description and examples for {category.name}. Code and
            resolution rules are fixed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Examples (one per line)</Label>
            <Textarea
              value={examplesText}
              onChange={(e) => setExamplesText(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
