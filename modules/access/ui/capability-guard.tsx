"use client"

import type { Capability } from "../domain/capability"
import { useAccess } from "./access-context"

export function CapabilityGuard({
  capability,
  children,
  fallback = null,
}: {
  capability: Capability
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { can } = useAccess()
  return can(capability) ? children : fallback
}
