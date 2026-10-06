import { redirect } from "next/navigation"

// "Spool Fabrication" grouped the shop stages; they are the fabrication workbench now.
export default function SpoolFabricationPage() {
  redirect("/fabrication")
}
