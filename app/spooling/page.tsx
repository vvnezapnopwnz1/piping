import { SpoolingHomeDashboard } from "@/components/spooling/spooling-home-dashboard"

export default function SpoolingHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Spooling</h1>
        <p className="mt-1 text-sm text-slate-500">
          Engineering → Site ISO document workflow. Receive, check, hold, release, and dispatch ISOs to Fabrication.
        </p>
      </div>
      <SpoolingHomeDashboard />
    </div>
  )
}
