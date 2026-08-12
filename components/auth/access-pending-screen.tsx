"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function AccessPendingScreen({
  email,
  onSignOut,
}: {
  email?: string
  onSignOut: () => Promise<void>
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Access pending</CardTitle>
          <CardDescription>
            Your account is signed in but has not been assigned to an active PipeQC project. Contact a system administrator to obtain project access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{email ?? "your account"}</span>
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => void onSignOut()} variant="outline">
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
