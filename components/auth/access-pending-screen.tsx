"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function AccessPendingScreen({
  email,
  onSignOut,
}: {
  email?: string
  onSignOut: () => Promise<void>
}) {
  const t = useTranslations("auth.pending")
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t.rich("signedInAs", { email: email ?? t("yourAccount"), b: (chunks) => <span className="font-medium text-foreground">{chunks}</span> })}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => void onSignOut()} variant="outline">
            {t("signOut")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
