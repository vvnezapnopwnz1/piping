"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ForbiddenScreen({
  projectCode,
  sectionLabel,
}: {
  projectCode: string
  sectionLabel: string
}) {
  const t = useTranslations("auth.forbidden")
  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description", { section: sectionLabel, project: projectCode })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("contact")}
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/">{t("goHome")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
