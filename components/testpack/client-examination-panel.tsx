"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTestpackStore } from "@/store/testpack-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import type { ClientWitnessRecord } from "@/lib/testpack-seed"

interface Props {
  testpackId: string
}

export function ClientExaminationPanel({ testpackId }: Props) {
  const tp = useTestpackStore((s) => s.testPacks.find((t) => t.id === testpackId))
  const recordClientExamination = useTestpackStore(
    (s) => s.recordClientExamination,
  )
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const { locked: pmLocked } = usePmWriteLock()

  const existing = tp?.clientWitness
  const [present, setPresent] = useState<boolean>(existing?.present ?? false)
  const [date, setDate] = useState<string>(existing?.date ?? "")
  const [signerName, setSignerName] = useState<string>(existing?.signerName ?? "")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPresent(existing?.present ?? false)
    setDate(existing?.date ?? "")
    setSignerName(existing?.signerName ?? "")
  }, [existing?.present, existing?.date, existing?.signerName])

  if (!tp) return null

  const handleSave = async () => {
    if (pmLocked) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 600))
    const payload: ClientWitnessRecord = {
      present,
      date: present ? date || undefined : undefined,
      signerName: present ? signerName.trim() || undefined : undefined,
      recordedBy: "PM-USER",
      recordedAt: new Date().toISOString(),
    }
    recordClientExamination(testpackId, payload)
    toast.success(`Client examination recorded for ${tp.id}`)
    pushNotification({
      severity: "info",
      category: "testpack",
      title: `${tp.id} client examination recorded`,
      description: present
        ? `Witness ${signerName} present on ${date}`
        : "No client witness required",
      href: `/testpack/explorer?tp=${tp.id}`,
    })
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">
            Client examination
          </CardTitle>
          <CardDescription>
            Owner&apos;s representative witness record for this test pack.
          </CardDescription>
        </div>
        {existing?.recordedAt ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Recorded
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="cw-present"
            checked={present}
            onCheckedChange={(v) => setPresent(v === true)}
            disabled={pmLocked}
          />
          <Label htmlFor="cw-present" className="text-sm">
            Client witness present
          </Label>
        </div>
        {present ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cw-date" className="text-xs">
                Witness date
              </Label>
              <Input
                id="cw-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
                disabled={pmLocked}
              />
            </div>
            <div>
              <Label htmlFor="cw-signer" className="text-xs">
                Signer name
              </Label>
              <Input
                id="cw-signer"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. J. Smith (Client QC)"
                className="h-9 text-sm"
                disabled={pmLocked}
              />
            </div>
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={pmLocked || busy}>
            <Save className="mr-2 h-4 w-4" /> Save record
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
