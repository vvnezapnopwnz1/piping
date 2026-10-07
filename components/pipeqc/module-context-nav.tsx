"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, ChevronRight } from "lucide-react"
import { useAccess } from "@/modules/access/ui/access-context"
import {
  canVisit,
  getWorkbenchHierarchy,
  getRelatedWork,
} from "./navigation-model"
import { useNavName } from "./nav-name"

export function ModuleContextNav() {
  const pathname = usePathname()
  const { can } = useAccess()
  const t = useTranslations("shell.contextNav")
  const name = useNavName()
  const hierarchy = getWorkbenchHierarchy(pathname, can, name)
  const related = getRelatedWork(pathname, can, name)
  return (
    <div className="sticky top-14 z-10 border-b border-border bg-background px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <nav
          aria-label={t("breadcrumb")}
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs"
        >
          {hierarchy.map((page, index) => (
            <span key={page.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="size-3 text-muted-foreground"
                />
              )}
              {index === hierarchy.length - 1 ? (
                <span aria-current="page" className="font-medium">
                  {page.title}
                </span>
              ) : canVisit(page.href, can) ? (
                <Link
                  href={page.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {page.title}
                </Link>
              ) : (
                <span className="text-muted-foreground">{page.title}</span>
              )}
            </span>
          ))}
        </nav>
        {related.length > 0 && (
          <nav
            aria-label={t("relatedWork")}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs"
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("relatedWork")}
            </span>
            {related.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                title={page.purpose}
                className="inline-flex min-h-7 items-center gap-1 rounded border border-border px-2 text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {page.title}
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-3 text-muted-foreground"
                />
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
