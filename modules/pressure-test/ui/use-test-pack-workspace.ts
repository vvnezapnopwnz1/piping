"use client"

import { useTestPackTranslations, reportTestPackError } from "./test-pack-i18n"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createRequestVersion } from "@/lib/request-version"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  createSupabaseTestPackLoaderRepository,
  loadTestPackWorkspaceSnapshot,
  type TestPackLoaderRepository,
  type TestPackWorkspaceSnapshot,
} from "./test-pack-workspace-loader"

export interface UseTestPackWorkspaceOptions {
  projectId: string
  testPackId: string | null
  repo?: TestPackLoaderRepository
}

export interface TestPackWorkspaceState {
  projectId: string
  testPackId: string | null
  snapshot: TestPackWorkspaceSnapshot | null
  loading: boolean
  error: string | null
  unavailableReason: string | null
  dataCurrent: boolean
  pending: boolean
  runCommand: <T>(action: () => Promise<T>) => Promise<T>
  refresh: () => Promise<void>
}

export function useTestPackWorkspace({
  projectId,
  testPackId,
  repo: customRepo,
}: UseTestPackWorkspaceOptions): TestPackWorkspaceState {
  const t = useTestPackTranslations()
  const repo = useMemo(
    () => customRepo ?? createSupabaseTestPackLoaderRepository(getSupabaseBrowserClient()),
    [customRepo],
  )

  const [snapshot, setSnapshot] = useState<TestPackWorkspaceSnapshot | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(testPackId))
  const [error, setError] = useState<string | null>(null)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [dataCurrent, setDataCurrent] = useState<boolean>(false)
  const [pending, setPending] = useState<boolean>(false)

  const pendingRef = useRef(false)
  const versionRef = useRef(createRequestVersion())

  const runCommand = useCallback(async <T>(action: () => Promise<T>): Promise<T> => {
    if (pendingRef.current) {
      throw new Error("An operation is already in progress.")
    }
    pendingRef.current = true
    setPending(true)
    try {
      return await action()
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }, [])

  const executeLoad = useCallback(
    async (isRefresh = false) => {
      const token = versionRef.current.start()
      if (!testPackId) {
        if (!token.isCurrent()) return
        setSnapshot(null)
        setLoading(false)
        setError(null)
        setUnavailableReason(null)
        setDataCurrent(false)
        return
      }

      setLoading(true)
      if (!isRefresh) {
        setError(null)
        setUnavailableReason(null)
      }

      try {
        const res = await loadTestPackWorkspaceSnapshot(repo, projectId, testPackId)
        if (!token.isCurrent()) return

        if (res.status === "available") {
          setSnapshot(res.snapshot)
          setError(null)
          setUnavailableReason(null)
          setDataCurrent(true)
        } else {
          setSnapshot(null)
          setUnavailableReason(res.reason)
          setDataCurrent(false)
        }
      } catch (cause) {
        if (!token.isCurrent()) return
        const message = reportTestPackError(cause, t("text.failedToLoadTestPackDetails"))
        setError(message)
        setDataCurrent(false)
        if (!isRefresh) {
          setSnapshot(null)
        }
      } finally {
        if (token.isCurrent()) {
          setLoading(false)
        }
      }
    },
    [projectId, testPackId, repo, t],
  )

  useEffect(() => {
    const version = versionRef.current
    version.invalidate()
    setSnapshot(null)
    setError(null)
    setUnavailableReason(null)
    setLoading(Boolean(testPackId))
    setDataCurrent(false)

    void executeLoad(false)

    return () => {
      version.invalidate()
    }
  }, [projectId, testPackId, executeLoad])

  const refresh = useCallback(async () => {
    await executeLoad(true)
  }, [executeLoad])

  const isOwnerMatch = Boolean(
    snapshot &&
      snapshot.pack.projectId === projectId &&
      snapshot.pack.id === testPackId,
  )

  return {
    projectId,
    testPackId,
    snapshot: isOwnerMatch ? snapshot : null,
    loading,
    error,
    unavailableReason,
    dataCurrent,
    pending,
    runCommand,
    refresh,
  }
}
