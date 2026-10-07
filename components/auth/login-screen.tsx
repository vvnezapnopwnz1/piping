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

export function LoginScreen() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const t = useTranslations("auth.login")
  const [error, setError] = React.useState<{ title: string; detail?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      })

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
