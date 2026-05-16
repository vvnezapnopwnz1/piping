import { TestpackExplorer } from "@/components/testpack/testpack-explorer"

export default function TestpackExplorerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Testpack Explorer
        </h1>
        <p className="text-muted-foreground">
          Drill down through systems, subsystems, test packs, and ISOs to track testing readiness.
        </p>
      </div>
      <TestpackExplorer />
    </div>
  )
}
