import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * The landing page deliberately carries no roll-up numbers.
 *
 * It used to read the demo stores, which meant that against a real project with no spools it
 * reported "Welds requiring action 1" and "NDE batches active 4" — figures a reader had no way
 * to tell were invented. A cross-module roll-up over `spool_construction_status` and
 * `spool_erection_readiness` is Track 11 work; until it exists, this page routes to the module
 * screens that hold the real figures rather than inventing its own.
 */

interface ModuleLink {
  href: string
  title: string
  description: string
  live: boolean
  note?: string
}

const MODULES: readonly ModuleLink[] = [
  {
    href: "/admin",
    title: "Administration",
    description: "Project definition, referentials, access rights, imports and progress weights.",
    live: true,
  },
  {
    href: "/spooling/browse",
    title: "Spooling",
    description: "SpoolGen import, engineering definitions and revision history.",
    live: true,
    note: "ISO workflow and transmittals outstanding",
  },
  {
    href: "/fabrication/dashboard",
    title: "Fabrication",
    description:
      "Material traceability, shop weld progress, PWHT, painting, laydown and QC release.",
    live: true,
  },
  {
    href: "/nde",
    title: "NDE",
    description: "Batches, results, repair and tracer cascade, penalty escalation.",
    live: true,
  },
  {
    href: "/erection/dashboard",
    title: "Erection",
    description:
      "To site, erected, field welds, field material, supports, and derived Ready For Test.",
    live: true,
  },
  {
    href: "/tracking",
    title: "Spool Tracking",
    description: "Movement history, current location and transit alerts.",
    live: true,
  },
  {
    href: "/flange",
    title: "Flange Management",
    description: "Flange joints, bolt-up progress and torque records.",
    live: true,
  },
  {
    href: "/testpack",
    title: "Test Packs",
    description: "Test pack assembly, readiness and the pressure-test workflow.",
    live: true,
  },
  {
    href: "/reports",
    title: "Reports & Forms",
    description: "Generated reports and forms from durable records.",
    live: true,
  },
]

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">PipeQC</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Industrial piping construction and quality control. Every screen reads its own figures
          from the database; this page holds none of its own.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => (
          <Link key={module.href} href={module.href} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <Badge variant={module.live ? "default" : "outline"}>
                    {module.live ? "live" : (module.note ?? "planned")}
                  </Badge>
                </div>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              {module.live && module.note ? (
                <CardContent>
                  <p className="text-muted-foreground text-xs">{module.note}</p>
                </CardContent>
              ) : null}
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
