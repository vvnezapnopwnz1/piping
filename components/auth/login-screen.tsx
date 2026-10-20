"use client"

import { useTranslations } from "next-intl"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocaleToggle } from "@/components/pipeqc/locale-switch"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"

// Demo stand only. Both values are inlined into the public bundle at build time, so they must belong
// to a throwaway account on an isolated Supabase project, never to a production one.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_AUTOLOGIN_EMAIL
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_AUTOLOGIN_PASSWORD

export function LoginScreen() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const t = useTranslations("auth.login")
  const tShell = useTranslations("shell")
  const [error, setError] = React.useState<{ title: string; detail?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [demoPending, setDemoPending] = React.useState(Boolean(DEMO_EMAIL && DEMO_PASSWORD))

  const signIn = React.useCallback(
    async (credentials: { email: string; password: string }) => {
      setError(null)
      setIsSubmitting(true)

      try {
        const { error: signInError } =
          await getSupabaseBrowserClient().auth.signInWithPassword(credentials)

        if (signInError) {
          setError(
            signInError.code === "invalid_credentials"
              ? { title: t("invalidCredentials") }
              : { title: t("failed"), detail: errorDetail(signInError) },
          )
        }
      } catch (signInError) {
        setError({ title: t("failed"), detail: errorDetail(signInError) })
      } finally {
        setIsSubmitting(false)
      }
    },
    [t],
  )

  // One attempt per mount: if the demo account is rejected the manual form stays available.
  const demoAttempted = React.useRef(false)
  React.useEffect(() => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD || demoAttempted.current) return
    demoAttempted.current = true
    void signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD }).finally(() => setDemoPending(false))
  }, [signIn])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await signIn({ email, password })
  }

  if (demoPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">{tShell("loading")}</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                autoComplete="email"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                autoComplete="current-password"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error.title}
                {error.detail ? <span className="mt-1 block text-xs">{error.detail}</span> : null}
              </p>
            )}
            <Button className="w-full" loading={isSubmitting} type="submit">{t("submit")}</Button>
          </form>
        </CardContent>
      </Card>
      <LocaleToggle />
    </main>
  )
}
