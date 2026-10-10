// modules/project-setup/ui/reference-import-link.tsx
"use client"

import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { REFERENCE_IMPORT_TYPE, type ReferenceKey } from "./reference-catalog"

export function ReferenceImportLink({ reference }: { reference: ReferenceKey }) {
  const t = useTranslations("projectSetup.projectReferential")
  const access = useOptionalAccess()
  const activityCode = useSupabaseAuth().access?.activityCode ?? ""
  const type = REFERENCE_IMPORT_TYPE[reference]
  if (!type || !access || !access.can("imports.manage") || !canVisit("/admin/imports", access.can)) return null
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={withProject(`/admin/imports?type=${type}`, activityCode)}>
        <FileSpreadsheet className="mr-2 h-4 w-4" /> {t("importFromExcel")}
      </Link>
    </Button>
  )
}
