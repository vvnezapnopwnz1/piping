// modules/project-setup/ui/system-reference-navigator.tsx
"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

export type SystemReferenceKey = "material-types" | "torquing" | "film-quantity" | "ut-rules"

export const SYSTEM_REFERENCE_KEYS: readonly SystemReferenceKey[] = [
  "material-types",
  "torquing",
  "film-quantity",
  "ut-rules",
] as const

export const DEFAULT_SYSTEM_REFERENCE: SystemReferenceKey = "material-types"

export function parseSystemReferenceKey(raw: string | null | undefined): SystemReferenceKey {
  return raw && (SYSTEM_REFERENCE_KEYS as readonly string[]).includes(raw)
    ? (raw as SystemReferenceKey)
    : DEFAULT_SYSTEM_REFERENCE
}

const NAV_TITLE_KEYS: Record<
  SystemReferenceKey,
  "materialTypesTitle" | "torquingTitle" | "filmRulesTitle" | "utRulesTitle"
> = {
  "material-types": "materialTypesTitle",
  "torquing": "torquingTitle",
  "film-quantity": "filmRulesTitle",
  "ut-rules": "utRulesTitle",
}

export function SystemReferenceNavigator({
  active,
  hrefFor,
}: {
  active: SystemReferenceKey
  hrefFor: (key: SystemReferenceKey) => string
}) {
  const t = useTranslations("projectSetup.systemReferential")

  return (
    <nav
      aria-label={t("navigatorLabel")}
      className="space-y-1 lg:sticky lg:top-4 lg:self-start"
    >
      <ul className="space-y-1">
        {SYSTEM_REFERENCE_KEYS.map((key) => (
          <li key={key}>
            <Link
              href={hrefFor(key)}
              replace
              scroll={false}
              aria-current={key === active ? "page" : undefined}
              className={cn(
                "hover:bg-accent flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm",
                key === active && "bg-accent font-medium",
              )}
            >
              <span>{t(NAV_TITLE_KEYS[key])}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
