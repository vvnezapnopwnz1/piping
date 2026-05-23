"use client"

import { use, useEffect } from "react"
import { useTestpackStore } from "@/store/testpack-store"
import { useFlangeStore } from "@/store/flange-store"

export default function ReinstatementPrintPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = use(params)
  const request = useTestpackStore((s) =>
    s.reinstatementRequests.find((r) => r.id === requestId),
  )
  const punchItems = useTestpackStore((s) => s.punchItems)
  const flangeJoints = useFlangeStore((s) => s.joints)

  useEffect(() => {
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])

  if (!request) {
    return (
      <div className="p-8 text-sm text-slate-600">Request not found.</div>
    )
  }

  const items = punchItems.filter((pi) =>
    request.punchItemIds.includes(pi.id),
  )

  return (
    <div className="mx-auto max-w-4xl bg-white p-12 print:p-6">
      <style>{`@media print { @page { size: A4; margin: 18mm; } .print-hide { display: none; } }`}</style>
      <header className="border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-bold">PipeQC · Reinstatement Request</h1>
        <p className="font-mono text-lg">{request.id}</p>
      </header>
      <section className="py-4 text-sm">
        <p>Assigned to: {request.assignedTo}</p>
        <p>Issued: {new Date(request.createdAt).toLocaleString()}</p>
      </section>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 text-left">Joint / Punch</th>
            <th className="py-1 text-left">Category</th>
            <th className="py-1 text-left">ISO</th>
            <th className="py-1 text-left">Flange joint</th>
          </tr>
        </thead>
        <tbody>
          {items.map((pi) => {
            const joint = flangeJoints.find(
              (j) => j.id === pi.id || j.tagNo === pi.tagNo,
            )
            return (
              <tr key={pi.id} className="border-b border-slate-200">
                <td className="py-1 font-mono">{pi.id}</td>
                <td className="py-1">{pi.category}</td>
                <td className="py-1">{pi.isoId}</td>
                <td className="py-1">{joint?.btNo ?? pi.tagNo ?? "—"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="print-hide mt-8 text-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white"
        >
          Print this request
        </button>
      </div>
    </div>
  )
}
