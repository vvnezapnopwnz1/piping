"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import type { WeldJoint, WeldStatus } from "@/lib/weld-data"
import { X, Lock, AlertTriangle, CheckCircle2, Save } from "lucide-react"

interface WeldDetailPanelProps {
  joint: WeldJoint | null
  onClose: () => void
  onSave: (updated: WeldJoint) => void
}

const WELD_STATUSES: WeldStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Rejected",
  "Rework",
  "On Hold",
]

const WELDERS = ["WLD-007", "WLD-015", "WLD-019", "WLD-028", "WLD-033", "WLD-042", "WLD-054", "WLD-061"]
const INSPECTORS = ["ENG-01", "ENG-02", "ENG-03", "ENG-04", "ENG-05", "ENG-06", "ENG-07"]

function FieldRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label className="text-xs font-medium text-slate-600 uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  )
}

function ReadOnlyField({ value }: { value: string }) {
  return (
    <div className="h-8 px-3 flex items-center rounded border border-slate-200 bg-slate-50 text-xs text-slate-700 font-mono">
      {value || "—"}
    </div>
  )
}

export function WeldDetailPanel({ joint, onClose, onSave }: WeldDetailPanelProps) {
  const [form, setForm] = useState<WeldJoint | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (joint) {
      setForm({ ...joint })
      setSaved(false)
    }
  }, [joint])

  if (!joint || !form) {
    return (
      <aside className="w-[360px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col items-center justify-center">
        <div className="text-center px-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Select a weld joint to view or edit its details</p>
        </div>
      </aside>
    )
  }

  const isLocked = form.isLocked
  const isRejected = form.status === "Rejected"

  const update = (field: keyof WeldJoint, value: string | boolean) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev)
    setSaved(false)
  }

  const handleSave = () => {
    if (form && !isLocked) {
      onSave(form)
      setSaved(true)
    }
  }

  return (
    <aside className="w-[360px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 font-mono">{form.jointNo}</span>
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-300">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">{form.spoolNo}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={form.status} />
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Locked / Rejected Notice */}
      {isLocked && (
        <div className="mx-4 mt-3 px-3 py-2 rounded border border-slate-300 bg-slate-100 flex items-center gap-2 flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          <p className="text-xs text-slate-600">This weld has been progressed and is locked for editing.</p>
        </div>
      )}
      {isRejected && !isLocked && (
        <div className="mx-4 mt-3 px-3 py-2 rounded border border-red-300 bg-red-100 flex items-center gap-2 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-red-700 flex-shrink-0" />
          <p className="text-xs text-red-700">Weld rejected. Update status after repair disposition.</p>
        </div>
      )}

      {/* Form Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        {/* Section: Identification */}
        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            Identification
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="ISO No">
                <ReadOnlyField value={form.isoNo} />
              </FieldRow>
              <FieldRow label="Dia-inch">
                <ReadOnlyField value={form.diaInch} />
              </FieldRow>
            </div>
            <FieldRow label="Material Type">
              <ReadOnlyField value={form.materialType} />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="WPS No">
                <ReadOnlyField value={form.wpsNo} />
              </FieldRow>
              <FieldRow label="Heat No">
                {isLocked ? (
                  <ReadOnlyField value={form.heatNo || "—"} />
                ) : (
                  <Input
                    value={form.heatNo || ""}
                    onChange={(e) => update("heatNo", e.target.value)}
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs font-mono"
                    placeholder="HT-XXXX"
                  />
                )}
              </FieldRow>
            </div>
            <FieldRow label="DWIR No">
              <ReadOnlyField value={form.dwirNo} />
            </FieldRow>
          </div>
        </div>

        {/* Section: Welding Details */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-800">
            Welding Details
          </p>
          <div className="flex flex-col gap-3">
            <FieldRow label="Welder Code">
              {isLocked ? (
                <ReadOnlyField value={form.welderCode} />
              ) : (
                <Select
                  value={form.welderCode}
                  onValueChange={(val) => update("welderCode", val)}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    {WELDERS.map((w) => (
                      <SelectItem key={w} value={w} className="text-slate-900 focus:bg-slate-100 text-xs font-mono">
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldRow>

            <FieldRow label="Weld Date">
              {isLocked ? (
                <ReadOnlyField value={form.weldDate} />
              ) : (
                <Input
                  type="date"
                  value={form.weldDate ? new Date(form.weldDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    const d = new Date(e.target.value)
                    update("weldDate", d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }))
                  }}
                  className="h-8 bg-white border-slate-300 text-slate-900 text-xs [color-scheme:light]"
                />
              )}
            </FieldRow>

            <FieldRow label="Status">
              {isLocked ? (
                <div className="h-8 px-3 flex items-center">
                  <StatusBadge status={form.status} />
                </div>
              ) : (
                <Select
                  value={form.status}
                  onValueChange={(val) => update("status", val as WeldStatus)}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    {WELD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-slate-900 focus:bg-slate-100 text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldRow>
          </div>
        </div>

        {/* Section: Fit-Up Inspection */}
        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            Fit-Up Inspection
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Inspector">
                {isLocked ? (
                  <ReadOnlyField value={form.fitUpInspector || "—"} />
                ) : (
                  <Select
                    value={form.fitUpInspector || ""}
                    onValueChange={(val) => update("fitUpInspector", val)}
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {INSPECTORS.map((i) => (
                        <SelectItem key={i} value={i} className="text-slate-900 focus:bg-slate-100 text-xs font-mono">
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldRow>
              <FieldRow label="Fit-Up Date">
                {isLocked ? (
                  <ReadOnlyField value={form.fitUpDate || "—"} />
                ) : (
                  <Input
                    type="date"
                    value={form.fitUpDate ? new Date(form.fitUpDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => {
                      const d = new Date(e.target.value)
                      update("fitUpDate", d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }))
                    }}
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs [color-scheme:light]"
                  />
                )}
              </FieldRow>
            </div>
          </div>
        </div>

        {/* Section: NDE / RT */}
        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            NDE / RT
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="RT Report No">
                {isLocked ? (
                  <ReadOnlyField value={form.rtNo || "—"} />
                ) : (
                  <Input
                    value={form.rtNo || ""}
                    onChange={(e) => update("rtNo", e.target.value)}
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs font-mono"
                    placeholder="RT-YYYY-XXXX"
                  />
                )}
              </FieldRow>
              <FieldRow label="RT Result">
                {isLocked ? (
                  <ReadOnlyField value={form.rtResult || "—"} />
                ) : (
                  <Select
                    value={form.rtResult || ""}
                    onValueChange={(val) => update("rtResult", val)}
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 text-xs h-8">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      <SelectItem value="Accepted" className="text-emerald-700 focus:bg-slate-100 text-xs">Accepted</SelectItem>
                      <SelectItem value="Rejected" className="text-red-700 focus:bg-slate-100 text-xs">Rejected</SelectItem>
                      <SelectItem value="Pending" className="text-amber-700 focus:bg-slate-100 text-xs">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FieldRow>
            </div>

            {/* PWHT */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="pwht"
                checked={!!form.pwhtRequired}
                onChange={(e) => update("pwhtRequired", e.target.checked)}
                disabled={isLocked}
                className="w-4 h-4 rounded border-slate-300 bg-white accent-sky-600 cursor-pointer disabled:cursor-not-allowed"
              />
              <label
                htmlFor="pwht"
                className={cn(
                  "text-xs select-none",
                  isLocked ? "text-slate-500 cursor-not-allowed" : "text-slate-700 cursor-pointer"
                )}
              >
                PWHT Required
              </label>
            </div>

            {form.pwhtRequired && (
              <FieldRow label="PWHT Date">
                {isLocked ? (
                  <ReadOnlyField value={form.pwhtDate || "—"} />
                ) : (
                  <Input
                    type="date"
                    value={form.pwhtDate ? new Date(form.pwhtDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => {
                      const d = new Date(e.target.value)
                      update("pwhtDate", d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }))
                    }}
                    className="h-8 bg-white border-slate-300 text-slate-900 text-xs [color-scheme:light]"
                  />
                )}
              </FieldRow>
            )}
          </div>
        </div>

        {/* Section: Remarks */}
        <div>
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3 pb-1.5 border-b border-slate-200">
            Remarks
          </p>
          {isLocked ? (
            <div className="px-3 py-2 rounded border border-slate-200 bg-slate-50 text-xs text-slate-700 min-h-[72px]">
              {form.remarks || "—"}
            </div>
          ) : (
            <textarea
              value={form.remarks || ""}
              onChange={(e) => update("remarks", e.target.value)}
              rows={3}
              placeholder="Enter QC notes or disposition…"
              className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-slate-900 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-sky-600 placeholder:text-slate-500"
            />
          )}
        </div>
      </div>

      {/* Footer Actions */}
      {!isLocked && (
        <div className="px-5 py-4 border-t border-slate-200 flex items-center gap-3 flex-shrink-0">
          <Button
            onClick={handleSave}
            className={cn(
              "flex-1 h-9 text-xs font-medium gap-2",
              saved
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-sky-600 hover:bg-sky-500 text-white"
            )}
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            Cancel
          </Button>
        </div>
      )}
    </aside>
  )
}
