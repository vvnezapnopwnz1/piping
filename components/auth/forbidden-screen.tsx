"use client"

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
  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            You do not have access to {sectionLabel} in project {projectCode}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact a project administrator if you believe this is incorrect.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
