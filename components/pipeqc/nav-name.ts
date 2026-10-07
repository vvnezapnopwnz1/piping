"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"

import type { NavKey } from "@/config/navigation"

import type { NavName } from "./navigation-model"

/** The current language's words for a navigation key (the titles in `config/navigation.ts`). */
export function useNavName(): NavName {
  const t = useTranslations("nav")
  return useCallback((key: NavKey) => t(key), [t])
}
