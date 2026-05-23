"use client"

import { use, useEffect } from "react"
import { useTestpackStore } from "@/store/testpack-store"

export default function LineCheckPrintPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = use(params)
  const request = useTestpackStore((s) =>
    s.checkingRequests.find((r) => r.id === requestId),
  )
  const isos = useTestpackStore((s) => s.isos)

  useEffect(() => {
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])

  if (!request) {
    return (
      <div className="p-8 text-sm text-slate-600">Request not found.</div>
    )
  }

  const linkedIsos = isos.filter((iso) => request.isoIds.includes(iso.id))

  return (
    <div className="mx-auto max-w-4xl bg-white p-12 print:p-6">
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm; }
          body { background: white !important; }
          .print-hide { display: none; }
        }
      `}</style>

      <header className="border-b-2 border-slate-900 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">PipeQC · Line Check Request</h1>
            <p className="text-sm text-slate-600">
              EPC Piping Construction Management System
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Request No
            </p>
            <p className="font-mono text-xl font-bold">{request.id}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-x-8 gap-y-2 py-4">
        <div>
          <p className="text-xs uppercase text-slate-500">Issued at</p>
          <p className="text-sm">
            {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Assigned to</p>
          <p className="text-sm">{request.assignedTo}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">ISO count</p>
          <p className="text-sm">{request.isoIds.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500">Request type</p>
          <p className="text-sm">Line Check Walk-down</p>
        </div>
      </section>

      <section className="border-y border-slate-200 py-3">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-700">
          ISOs to walk down
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1 pr-3">ISO ID</th>
              <th className="py-1 pr-3">Test Pack</th>
              <th className="py-1 pr-3">Welds done</th>
              <th className="py-1">Spools supported</th>
            </tr>
          </thead>
          <tbody>
            {linkedIsos.map((iso) => (
              <tr key={iso.id} className="border-b border-slate-200">
                <td className="py-1 pr-3 font-mono">{iso.id}</td>
                <td className="py-1 pr-3">{iso.testpackId}</td>
                <td className="py-1 pr-3">{iso.allWeldsWelded ? "✓" : "—"}</td>
                <td className="py-1">{iso.spoolsSupported ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pt-8 text-sm">
        <p className="mb-1">
          Findings to be recorded against ISO. Punch items category X must be
          cleared before testing.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-12">
          <div>
            <div className="border-b border-slate-900" />
            <p className="mt-1 text-xs uppercase text-slate-600">
              Walk-down inspector signature
            </p>
          </div>
          <div>
            <div className="border-b border-slate-900" />
            <p className="mt-1 text-xs uppercase text-slate-600">Date</p>
          </div>
        </div>
      </section>

      <div className="print-hide mt-8 text-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Print this request
        </button>
      </div>
    </div>
  )
}
