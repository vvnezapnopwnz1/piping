"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthErrorScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Unable to verify access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please try again. If the issue continues, contact your system administrator.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.reload()} type="button">
            Retry
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
