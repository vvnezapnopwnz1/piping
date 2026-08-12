import { normalizeTestPackInput, type CreateTestPackInput, type UpdateTestPackInput } from "../domain/test-pack"
import { createTestPack, updateTestPack, composeTestPack, removeTestPackIsometric, moveTestPackIsometric, archiveTestPack } from "../infrastructure/supabase-pressure-test-repository"

const key = (prefix: string) => `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`

export async function createManagedTestPack(repository: Parameters<typeof createTestPack>[0], projectId: string, input: CreateTestPackInput, idempotencyKey = key("create-test-pack")) {
  const validation = normalizeTestPackInput(input)
  if (!validation.ok) return validation
  const value = await createTestPack(repository, projectId, validation.value, idempotencyKey)
  return { ok: true as const, value }
}

export async function updateManagedTestPack(repository: Parameters<typeof updateTestPack>[0], testPackId: string, input: UpdateTestPackInput, idempotencyKey = key("update-test-pack")) {
  const validation = normalizeTestPackInput({ ...input, isoIds: [] })
  if (!validation.ok) return validation
  const value = await updateTestPack(repository, testPackId, validation.value, idempotencyKey)
  return { ok: true as const, value }
}

export const composeManagedTestPack = (repository: Parameters<typeof composeTestPack>[0], testPackId: string, isometricId: string, idempotencyKey = key("compose-test-pack")) => composeTestPack(repository, testPackId, isometricId, idempotencyKey)
export const removeManagedTestPackIsometric = (repository: Parameters<typeof removeTestPackIsometric>[0], testPackId: string, isometricId: string, idempotencyKey = key("remove-test-pack-iso")) => removeTestPackIsometric(repository, testPackId, isometricId, idempotencyKey)
export const moveManagedTestPackIsometric = (repository: Parameters<typeof moveTestPackIsometric>[0], testPackId: string, isometricId: string, destinationTestPackId: string, idempotencyKey = key("move-test-pack-iso")) => moveTestPackIsometric(repository, testPackId, isometricId, destinationTestPackId, idempotencyKey)
export const archiveManagedTestPack = (repository: Parameters<typeof archiveTestPack>[0], testPackId: string, idempotencyKey = key("archive-test-pack")) => archiveTestPack(repository, testPackId, idempotencyKey)
