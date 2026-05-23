"use client"

import { Badge } from "@/components/ui/badge"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { useScopeLock } from "@/lib/scope-lock"

export function useTestpackWorkflowLocks() {
  const { locked: pmLocked } = usePmWriteLock()
  const scope = useScopeLock()
  return { pmLocked, scope }
}

export function TestpackWorkflowGuards({ className }: { className?: string }) {
  const { pmLocked, scope } = useTestpackWorkflowLocks()
  return (
    <div className={className}>
      {scope.active ? (
        <Badge variant="outline" className="mb-2 text-xs">
          Scope: {scope.subCode}
        </Badge>
      ) : null}
      {pmLocked ? (
        <div className="mb-4">
          <PmWriteLockBanner />
        </div>
      ) : null}
    </div>
  )
}
