import { RequestPreparationScreen } from "@/modules/pressure-test/ui/request-preparation-screen"

export default function LineCheckPage() {
  return <RequestPreparationScreen requestType="line_check" progressHref="/testpack/pressure-test/line-check/progress" />
}
