import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"

import { LOCALE_COOKIE, resolveLocale } from "./locale"
import { messagesFor } from "./messages"

export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language"))
  // PipeQC shows calendar dates without a time, so UTC keeps each date on its own day. Moments
  // (scans, uploads) go through `formatMoment`, which uses the viewer's own clock.
  return { locale, messages: messagesFor(locale), timeZone: "UTC" }
})
