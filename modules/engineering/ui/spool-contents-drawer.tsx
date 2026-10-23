"use client"

import { useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

import { linkFrom } from "@/components/pipeqc/workspace-model"
import { withProject } from "@/components/pipeqc/project-url"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RecordDrawer } from "@/components/ui/record-drawer"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { cn } from "@/lib/utils"

import type { SpoolDetail } from "../infrastructure/supabase-engineering-repository"

/** A group of what the spool carries: its title, how many rows, its rows, or "none" when empty. */
function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const t = useTranslations("spooling")
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <span>{title}</span>
        <span className="text-muted-foreground text-xs font-normal tabular-nums">{count}</span>
      </h3>
      {count === 0 ? <p className="text-muted-foreground text-sm">{t("browser.drawer.none")}</p> : children}
    </section>
  )
}

/** The plain table the four short lists share: headings, then rows. */
function Grid({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>{head}</TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  )
}

/**
 * One spool of the isometric on screen: every weld, support, flange joint and material it carries,
 * removed ones included and struck through, and the way on to the shop for a current spool only.
 */
export function SpoolContentsDrawer({
  spool,
  isoNumber,
  revisionNumber,
  isCurrent,
  onClose,
}: {
  spool: SpoolDetail
  isoNumber: string
  revisionNumber: string
  isCurrent: boolean
  onClose: () => void
}) {
  const t = useTranslations("spooling")
  const activityCode = useSupabaseAuth().access?.activityCode ?? null
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname

  // A number the source never gave shows a dash; a removed one keeps its number, struck through.
  const number = (value: string, isRemoved = false) => (
    <span className="flex items-center gap-2">
      <span className={cn("font-mono text-xs", isRemoved && "text-muted-foreground line-through")}>{value || "—"}</span>
      {isRemoved ? <Badge variant="outline">{t("browser.removedItem")}</Badge> : null}
    </span>
  )

  return (
    <RecordDrawer
      recordKind="spool"
      kicker={t("browser.drawer.kicker")}
      title={spool.spoolNumber || "—"}
      meta={t("browser.drawer.meta", { iso: isoNumber, revision: revisionNumber })}
      status={spool.isRemoved ? <Badge variant="outline">{t("browser.removed")}</Badge> : undefined}
      returnLabel={t("browser.drawer.back")}
      closeLabel={t("browser.drawer.close", { spool: spool.spoolNumber })}
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* Fabrication works on current spools only: a superseded or draft spool has nowhere to go. */}
        {isCurrent && !spool.isRemoved ? (
          <Button asChild size="sm">
            <Link href={linkFrom(withProject(`/fabrication?spool=${encodeURIComponent(spool.spoolRevisionId)}`, activityCode), here)}>
              {t("browser.drawer.openInFabrication")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        <Section title={t("browser.drawer.welds")} count={spool.welds.length}>
          <Grid head={<>
            <TableHead>{t("browser.drawer.weld.number")}</TableHead>
            <TableHead>{t("browser.drawer.weld.type")}</TableHead>
            <TableHead numeric>{t("browser.drawer.weld.diameter")}</TableHead>
            <TableHead numeric>{t("browser.drawer.weld.thickness")}</TableHead>
            <TableHead>{t("browser.drawer.weld.location")}</TableHead>
          </>}>
            {spool.welds.map((weld) => (
              <TableRow key={weld.id}>
                <TableCell>{number(weld.weldNumber, weld.isRemoved)}</TableCell>
                <TableCell>{weld.typeCode ?? "—"}</TableCell>
                <TableCell numeric>{weld.diameterInch ?? "—"}</TableCell>
                <TableCell numeric>{weld.thicknessMm ?? "—"}</TableCell>
                <TableCell>{weld.location ? t(`browser.drawer.location.${weld.location}`) : "—"}</TableCell>
              </TableRow>
            ))}
          </Grid>
        </Section>
        <Section title={t("browser.drawer.supports")} count={spool.supports.length}>
          <Grid head={<>
            <TableHead>{t("browser.drawer.support.number")}</TableHead>
            <TableHead>{t("browser.drawer.support.type")}</TableHead>
            <TableHead numeric>{t("browser.drawer.support.quantity")}</TableHead>
          </>}>
            {spool.supports.map((support) => (
              <TableRow key={support.id}>
                <TableCell>{number(support.supportNumber, support.isRemoved)}</TableCell>
                <TableCell>{support.supportType ?? "—"}</TableCell>
                <TableCell numeric>{support.quantity ?? "—"}</TableCell>
              </TableRow>
            ))}
          </Grid>
        </Section>
        <Section title={t("browser.drawer.flanges")} count={spool.flanges.length}>
          <Grid head={<>
            <TableHead>{t("browser.drawer.flange.number")}</TableHead>
            <TableHead>{t("browser.drawer.flange.rating")}</TableHead>
            <TableHead numeric>{t("browser.drawer.flange.diameter")}</TableHead>
          </>}>
            {spool.flanges.map((flange) => (
              <TableRow key={flange.id}>
                <TableCell>{number(flange.flangeNumber, flange.isRemoved)}</TableCell>
                <TableCell>{flange.rating ?? "—"}</TableCell>
                <TableCell numeric>{flange.diameterInch ?? "—"}</TableCell>
              </TableRow>
            ))}
          </Grid>
        </Section>
        <Section title={t("browser.drawer.materials")} count={spool.materials.length}>
          <Grid head={<>
            <TableHead>{t("browser.drawer.material.ident")}</TableHead>
            <TableHead>{t("browser.drawer.material.description")}</TableHead>
            <TableHead numeric>{t("browser.drawer.material.quantity")}</TableHead>
          </>}>
            {spool.materials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="font-mono text-xs">{material.identCode || "—"}</TableCell>
                <TableCell className="max-w-56 truncate">{material.description ?? "—"}</TableCell>
                <TableCell numeric>{[material.quantity, material.unit].filter((part) => part !== null).join(" ") || "—"}</TableCell>
              </TableRow>
            ))}
          </Grid>
        </Section>
      </div>
    </RecordDrawer>
  )
}
