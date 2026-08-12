import { redirect } from "next/navigation"

// The demo import dry-run screen is superseded by the Track 03 import platform, which validates
// and applies PML, WPS and welder files against durable records.
export default function ImportSettingsPage() {
  redirect("/admin/imports")
}
