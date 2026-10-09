import type { useTranslations } from "next-intl"

import type { AttentionItem } from "./home-control-room-model"

export type HomeTranslator = ReturnType<typeof useTranslations<"home">>

/** The words for an attention row: the model gives the id and counts, the messages give the sentences. */
export function describeAttention(t: HomeTranslator, item: AttentionItem): { title: string; detail: string; action: string } {
  return {
    title: t(`attention.${item.id}.title`, { count: item.count, total: item.total ?? item.count }),
    detail: t(`attention.${item.id}.detail`),
    action: t(`attention.${item.id}.action`),
  }
}
