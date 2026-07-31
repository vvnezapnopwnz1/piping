import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MiB
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
])

export function getLogoExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png"
    case "image/jpeg":
      return "jpg"
    case "image/webp":
      return "webp"
    case "image/svg+xml":
      return "svg"
    default:
      return "bin"
  }
}

export function validateLogoFile(file: { size: number; type: string }): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "Logo file size must not exceed 2 MiB" }
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Only PNG, JPEG, WEBP, and SVG images are allowed" }
  }
  return { ok: true }
}

export async function uploadProjectLogo(
  client: SupabaseClient<Database>,
  projectId: string,
  brandType: "owner" | "contractor",
  file: File
): Promise<{ path: string; signedUrl: string }> {
  const validation = validateLogoFile(file)
  if (!validation.ok) throw new Error(validation.error)

  const ext = getLogoExtension(file.type)
  const objectPath = `${projectId}/${brandType}/logo.${ext}`

  const { error: uploadError } = await client.storage
    .from("project-branding")
    .upload(objectPath, file, { upsert: true, contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  // Update projects table with object path
  const fieldToUpdate = brandType === "owner" ? { owner_logo_path: objectPath } : { contractor_logo_path: objectPath }
  const { error: updateError } = await client
    .from("projects")
    .update(fieldToUpdate)
    .eq("id", projectId)

  if (updateError) throw new Error(updateError.message)

  // Create signed URL for display
  const { data: signedData, error: signedError } = await client.storage
    .from("project-branding")
    .createSignedUrl(objectPath, 3600)

  if (signedError || !signedData?.signedUrl) {
    throw new Error(signedError?.message || "Failed to generate signed URL")
  }

  return { path: objectPath, signedUrl: signedData.signedUrl }
}

export async function getProjectLogoSignedUrl(
  client: SupabaseClient<Database>,
  objectPath: string | null
): Promise<string | null> {
  if (!objectPath) return null
  // If it's already a full HTTP URL (e.g. demo mode), return as is
  if (objectPath.startsWith("http://") || objectPath.startsWith("https://")) {
    return objectPath
  }

  const { data, error } = await client.storage
    .from("project-branding")
    .createSignedUrl(objectPath, 3600)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
