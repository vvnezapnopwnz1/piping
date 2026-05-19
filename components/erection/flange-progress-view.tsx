"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { useErectionStore } from "@/store/erection-store"
import { useFlangeBoltProgressStore } from "@/store/flange-bolt-progress-store"
import {
  deriveFlangeBoltStatus,
  type FlangeBoltStatus,
} from "@/lib/erection-stage"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { FlangeProgressDetailPanel } from "./flange-progress-detail-panel"

function RelativeDate({ isoDate }: { isoDate: string }) {
  const [relative, setRelative] = useState<string | null>(null)
  useEffect(() => {
    const d = new Date(isoDate)
    if (!Number.isNaN(d.getTime())) {
      setRelative(formatDistanceToNow(d, { addSuffix: true }))
    }
  }, [isoDate])
  if (relative) return <span>{relative}</span>
  const d = new Date(isoDate)
  return (
    <span>
      {Number.isNaN(d.getTime())
        ? isoDate
        : d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
    </span>
  )
}

type FlangeFilter = "All" | "Awaiting Torque" | "Torque Assigned" | "Bolted" | "Verified"

const FLANGE_FILTERS: FlangeFilter[] = [
  "All",
  "Awaiting Torque",
  "Torque Assigned",
  "Bolted",
  "Verified",
]

const STATUS_PARAM_MAP: Record<FlangeFilter, string> = {
  All: "All",
  "Awaiting Torque": "Awaiting",
  "Torque Assigned": "Assigned",
  Bolted: "Bolted",
  Verified: "Verified",
}

const PARAM_STATUS_MAP: Record<string, FlangeFilter> = {
  All: "All",
  Awaiting: "Awaiting Torque",
  Assigned: "Torque Assigned",
  Bolted: "Bolted",
  Verified: "Verified",
}

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: FlangeFilter
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
      )}
    >
      {status}
      <span
        className={cn(
          "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full text-[10px] font-semibold",
          active ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        {count}
      </span>
    </button>
  )
}

export function FlangeProgressView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fieldWelds = useErectionStore((state) => state.fieldWelds)
  const records = useFlangeBoltProgressStore((state) => state.records)
  const getRecord = useFlangeBoltProgressStore((state) => state.getRecord)

  const [search, setSearch] = useState("")
  const [selectedJointId, setSelectedJointId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const urlStatus = searchParams.get("status")
  const urlJoint = searchParams.get("joint")
  const urlSpool = searchParams.get("spool")

  const [activeFilter, setActiveFilter] = useState<FlangeFilter>(
    urlStatus && PARAM_STATUS_MAP[urlStatus]
      ? PARAM_STATUS_MAP[urlStatus]
      : "Awaiting Torque",
  )

  const [spoolFilter, setSpoolFilter] = useState<string | null>(urlSpool)

  useEffect(() => {
    if (urlJoint) {
      setSelectedJointId(urlJoint)
      setPanelOpen(true)
    }
  }, [urlJoint])

  const flangeJoints = useMemo(() => {
    return fieldWelds.filter((w) => w.fieldJointType === "Flange Bolt")
  }, [fieldWelds])

  const rows = useMemo(() => {
    return flangeJoints.map((joint) => {
      const record = getRecord(joint.id)
      const status = deriveFlangeBoltStatus(record)
      return { joint, record, status }
    })
  }, [flangeJoints, records])

  const counts = useMemo(() => {
    const c: Record<FlangeFilter, number> = {
      All: rows.length,
      "Awaiting Torque": 0,
      "Torque Assigned": 0,
      Bolted: 0,
      Verified: 0,
    }
    for (const row of rows) {
      c[row.status] += 1
    }
    return c
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (spoolFilter && row.joint.spoolNo !== spoolFilter) return false
      if (activeFilter !== "All" && row.status !== activeFilter) return false
      if (q) {
        const hay = `${row.joint.jointNo} ${row.joint.spoolNo} ${row.joint.areaZone}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, activeFilter, search, spoolFilter])

  function handleFilterChange(f: FlangeFilter) {
    setActiveFilter(f)
    const params = new URLSearchParams(searchParams.toString())
    if (f === "Awaiting Torque") {
      params.delete("status")
    } else {
      params.set("status", STATUS_PARAM_MAP[f])
    }
    router.replace(`/erection/flange-progress?${params.toString()}`, { scroll: false })
  }

  function handleRowClick(jointId: string) {
    setSelectedJointId(jointId)
    setPanelOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set("joint", jointId)
    router.replace(`/erection/flange-progress?${params.toString()}`, { scroll: false })
  }

  function handlePanelClose(open: boolean) {
    setPanelOpen(open)
    if (!open) {
      setSelectedJointId(null)
      const params = new URLSearchParams(searchParams.toString())
      params.delete("joint")
      router.replace(`/erection/flange-progress?${params.toString()}`, { scroll: false })
    }
  }

  function clearSpoolFilter() {
    setSpoolFilter(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("spool")
    router.replace(`/erection/flange-progress?${params.toString()}`, { scroll: false })
  }

  const emptyMessage: Record<FlangeFilter, string> = {
    All: "No flange-bolt field joints in the seed.",
    "Awaiting Torque": "No flange bolts awaiting torque assignment.",
    "Torque Assigned": "No flange bolts in bolt-up queue.",
    Bolted: "No flange bolts awaiting verification.",
    Verified: "No verified flange bolts yet.",
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Flange Bolt Progress</h2>
        <p className="text-xs text-slate-500">
          §19.2.1 — torque assignment, bolt-up, and verification per field joint
        </p>
      </div>

      {spoolFilter && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
            Spool: {spoolFilter}
            <button
              onClick={clearSpoolFilter}
              className="ml-1 rounded-full hover:bg-slate-200"
              aria-label="Clear spool filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FLANGE_FILTERS.map((f) => (
          <StatusChip
            key={f}
            status={f}
            count={counts[f]}
            active={activeFilter === f}
            onClick={() => handleFilterChange(f)}
          />
        ))}
        <div className="relative ml-auto w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search joint, spool, zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Joint No</th>
              <th className="px-4 py-3 font-medium">Spool No</th>
              <th className="px-4 py-3 font-medium">Area Zone</th>
              <th className="px-4 py-3 font-medium">Dia / Material</th>
              <th className="px-4 py-3 font-medium">Torque (Nm)</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Bolted</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyMessage[activeFilter]}
                </td>
              </tr>
            )}
            {filtered.map(({ joint, record, status }) => (
              <tr
                key={joint.id}
                onClick={() => handleRowClick(joint.id)}
                className="cursor-pointer border-b last:border-0 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-mono font-medium text-slate-900">
                  {joint.jointNo}
                </td>
                <td className="px-4 py-3 text-slate-600">{joint.spoolNo}</td>
                <td className="px-4 py-3 text-slate-600">{joint.areaZone}</td>
                <td className="px-4 py-3 text-slate-600">
                  {joint.diaInch} · {joint.materialType}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record?.targetTorqueNm ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record?.boltingMethod ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record?.boltedDate ? <RelativeDate isoDate={record.boltedDate} /> : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {record?.verifiedDate ? <RelativeDate isoDate={record.verifiedDate} /> : "—"}
                </td>
                <td className="px-4 py-3">
                  <FlangeStatusBadge status={status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FlangeProgressDetailPanel
        fieldJointId={selectedJointId}
        open={panelOpen}
        onOpenChange={handlePanelClose}
      />
    </div>
  )
}

function FlangeStatusBadge({ status }: { status: FlangeBoltStatus }) {
  const styles: Record<FlangeBoltStatus, string> = {
    "Awaiting Torque": "border-slate-200 bg-slate-50 text-slate-600",
    "Torque Assigned": "border-amber-200 bg-amber-50 text-amber-700",
    Bolted: "border-violet-200 bg-violet-50 text-violet-700",
    Verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }
  return (
    <Badge variant="outline" className={cn("text-xs", styles[status])}>
      {status}
    </Badge>
  )
}
