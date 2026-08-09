import { RequestPreparationScreen } from "@/modules/pressure-test/ui/request-preparation-screen"

export default function BlindingPage() {
  return <RequestPreparationScreen requestType="blinding" progressHref="/testpack/pressure-test/blinding/progress" />
}
