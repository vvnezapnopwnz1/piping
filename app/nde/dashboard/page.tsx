"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

// The dashboard is the "summary" tab of /nde now; the old address keeps working and keeps the project in the query.
export default function NdeDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "summary")
    router.replace(`/nde?${params.toString()}`)
  }, [router, searchParams])
  return null
}
