import { RequestPreparationScreen } from "@/modules/pressure-test/ui/request-preparation-screen"

export default function ReinstatementPage() {
  return <RequestPreparationScreen requestType="reinstatement" progressHref="/testpack/pressure-test/reinstatement/progress" />
}
