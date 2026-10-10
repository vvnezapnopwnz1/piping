"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { readinessTarget, type ReferenceKey } from "./reference-catalog"
import type { ProjectSetupReadiness } from "../domain/setup-readiness"
import { evaluateReadinessStatus } from "../domain/setup-readiness"

// This panel is a to-do list, not a status light. A fully configured project has nothing left to
// say here, so it renders nothing rather than a permanent green banner that stops being read —
// which also keeps the top of the referential page clear on a seeded project.
export function SetupReadinessPanel({
  readiness,
  hrefForReference,
}: {
  readiness: ProjectSetupReadiness
  hrefForReference: (key: ReferenceKey) => string
}) {
  const t = useTranslations("projectSetup.readiness")
  const access = useOptionalAccess()
  const activityCode = useSupabaseAuth().access?.activityCode ?? ""

  if (readiness.missingCodes.length === 0) return null

  // Only the import gate is worth a badge: the card is on screen precisely because setup is
  // incomplete, so a second badge saying so would repeat the heading.
  const { isGateBReady } = evaluateReadinessStatus(readiness.missingCodes)

  return (
    <Card className="border-warning-border bg-warning-bg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">
            {t("incomplete", { count: readiness.missingCodes.length })}
          </CardTitle>
          <Badge
            variant="outline"
            className={
              isGateBReady
                ? "bg-success-bg text-success-fg border-success-border shrink-0"
                : "bg-background text-warning-fg border-warning-border shrink-0"
            }
          >
            {isGateBReady ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
            {isGateBReady ? t("readyForImport") : t("notReadyForImport")}
          </Badge>
        </div>
        <CardDescription>
          {isGateBReady ? t("descReady") : t("descNotReady")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {readiness.missingCodes.map((code) => {
            const tAny = t as any
            const label = tAny.has(`requirements.${code}`)
              ? tAny(`requirements.${code}`)
              : t("requirements.unknown", { code })

            const target = readinessTarget(code)
            const href =
              target?.kind === "reference"
                ? hrefForReference(target.key)
                : target?.kind === "page" && access && canVisit(target.href, access.can)
                  ? withProject(target.href, activityCode)
                  : null

            const chip = "inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium"

            return href ? (
              <Link key={code} href={href} scroll={false} className={`${chip} hover:bg-accent transition-colors`}>
                <span>{label}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            ) : (
              <span key={code} className={chip}>{label}</span>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

