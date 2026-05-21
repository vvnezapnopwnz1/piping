import Link from "next/link";
import { LayoutDashboard, Inbox, GitBranch, Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SpoolingHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Spooling
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Spooling — это handoff isometric-документов от инжиниринга на строительную площадку: приём, назначение spooler'у, проверка revision, удержание при необходимости и outbound-передача batch'ами на site. Shop-floor работа со spool'ами живёт отдельно в <Link href="/fabrication/dashboard" className="text-primary hover:underline">Fabrication</Link>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/spooling/engineering-transmittals">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Engineering Transmittals</CardTitle>
              </div>
              <CardDescription>Incoming iso releases from engineering</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/spooling/iso-workflow">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">ISO Workflow</CardTitle>
              </div>
              <CardDescription>Receive, assign, check, hold, release isos</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/spooling/spooling-transmittal">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Spooling Transmittal</CardTitle>
              </div>
              <CardDescription>Outbound iso batches to construction site</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
      
      <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
        No imports yet — load demo import from ISO Workflow.
      </div>
    </div>
  );
}
