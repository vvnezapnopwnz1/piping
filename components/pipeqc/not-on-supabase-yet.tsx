import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * A route whose module has not been built on Supabase yet.
 *
 * These routes used to render the demo implementation. The demo was removed from this branch
 * when the erection screens landed: carrying two full implementations meant every track paid
 * twice, once to build the real screen and once to retire the mock beside it. `main` still holds
 * the complete demo.
 *
 * Saying which track owns the route is the point — an empty screen with no explanation reads as
 * a defect, and a mock reads as working software. Neither is true here.
 */
export function NotOnSupabaseYet({
  title,
  track,
  summary,
}: {
  title: string
  /** The track that builds this module, e.g. "Track 10". */
  track: string
  /** What the module will do, in the user's terms. */
  summary: string
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Built in {track}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{summary}</p>
          <p className="text-muted-foreground">
            Nothing is recorded here yet. This route has no Supabase implementation, and the demo
            it used to render was removed from this branch so that no screen can be mistaken for
            working software. The demo remains available on <span className="font-mono">main</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
