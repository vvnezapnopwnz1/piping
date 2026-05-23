import Link from "next/link"
import { ListPlus, Compass, Gauge } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function TestpackIndexPage() {
  const tiles = [
    {
      href: "/testpack/builder",
      title: "Builder",
      desc: "Assemble test packs from unassigned ISOs",
      icon: ListPlus,
    },
    {
      href: "/testpack/explorer",
      title: "Explorer",
      desc: "Drill from system → subsystem → TP → ISO → spool",
      icon: Compass,
    },
    {
      href: "/testpack/pressure-test",
      title: "Pressure Test",
      desc: "Track readiness across line check, clearance, blinding, testing, reinstatement",
      icon: Gauge,
    },
  ]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Test Pack</h1>
        <p className="text-sm text-muted-foreground">
          Pick a sub-module to continue.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Icon className="h-5 w-5 text-sky-600" />
                  <CardTitle className="text-base">{t.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t.desc}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
