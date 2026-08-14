import path from "path"
import { Config } from "@remotion/cli/config"

// The captured clips + their timeline JSON live in ./demo-video (gitignored,
// regenerated with `npm run demo:record-video`) rather than under /public,
// so the video's raw footage never ships inside the Next.js app bundle.
Config.setPublicDir(path.join(process.cwd(), "demo-video"))
