"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthErrorScreen() {
  const t = useTranslations("auth.error")
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.reload()} type="button">
            {t("retry")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
