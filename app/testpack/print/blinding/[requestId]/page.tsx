"use client"

import { use, useEffect } from "react"
import { useTestpackStore } from "@/store/testpack-store"

export default function BlindingPrintPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = use(params)
  const request = useTestpackStore((s) =>
    s.blindingRequests.find((r) => r.id === requestId),
  )
  const testPacks = useTestpackStore((s) => s.testPacks)

  useEffect(() => {
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])

  if (!request) {
    return (
      <div className="p-8 text-sm text-slate-600">Request not found.</div>
    )
  }

  const linkedTps = testPacks.filter((tp) =>
    request.testpackIds.includes(tp.id),
  )

  return (
    <div className="mx-auto max-w-4xl bg-white p-12 print:p-6">
      <style>{`@media print { @page { size: A4; margin: 18mm; } .print-hide { display: none; } }`}</style>
      <header className="border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-bold">PipeQC · Blinding Request</h1>
        <p className="font-mono text-lg">{request.id}</p>
      </header>
      <section className="py-4 text-sm">
        <p>Assigned to: {request.assignedTo}</p>
        <p>Issued: {new Date(request.createdAt).toLocaleString()}</p>
      </section>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-1 text-left">Test Pack</th>
            <th className="py-1 text-left">System</th>
            <th className="py-1 text-left">Location</th>
            <th className="py-1 text-left">ISOs</th>
          </tr>
        </thead>
        <tbody>
          {linkedTps.map((tp) => (
            <tr key={tp.id} className="border-b border-slate-200">
              <td className="py-1 font-mono">{tp.id}</td>
              <td className="py-1">{tp.system}</td>
              <td className="py-1">{tp.location}</td>
              <td className="py-1">{tp.isoIds.length}</td>
            </tr>
          ))}
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
