import type { useTranslations } from "next-intl"

/** The `spooling` translator, for helpers that are built outside a component. */
export type SpoolingTranslator = ReturnType<typeof useTranslations<"spooling">>
