"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { REFERENCE_GROUPS, type ReferenceKey } from "./reference-catalog"

export function ReferenceNavigator({
  active,
  missing,
  hrefFor,
}: {
  active: ReferenceKey
  missing: ReadonlySet<ReferenceKey>
  hrefFor: (key: ReferenceKey) => string
}) {
  const t = useTranslations("projectSetup.projectReferential")
  const router = useRouter()

  return (
    <>
      {/* A phone has no room for thirty links above the table: one select instead. */}
      <div className="lg:hidden">
        <Select value={active} onValueChange={(key) => router.replace(hrefFor(key as ReferenceKey), { scroll: false })}>
          <SelectTrigger aria-label={t("chooseReference")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFERENCE_GROUPS.map((group) => (
              <SelectGroup key={group.id}>
                <SelectLabel>{t(`groups.${group.id}`)}</SelectLabel>
                {group.keys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`references.${key}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav
        aria-label={t("navigatorLabel")}
        className="hidden space-y-4 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto"
      >
        {REFERENCE_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="text-muted-foreground px-2 pb-1 text-xs font-medium uppercase tracking-wide">
              {t(`groups.${group.id}`)}
            </p>
            <ul>
              {group.keys.map((key) => (
                <li key={key}>
                  <Link
                    href={hrefFor(key)}
                    replace
                    scroll={false}
                    aria-current={key === active ? "page" : undefined}
                    className={cn(
                      "hover:bg-accent flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                      key === active && "bg-accent font-medium",
                    )}
                  >
                    <span>{t(`references.${key}`)}</span>
                    {missing.has(key) ? (
                      <span role="img" aria-label={t("referenceIncomplete")} className="bg-warning-fg size-2 shrink-0 rounded-full" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )
}
