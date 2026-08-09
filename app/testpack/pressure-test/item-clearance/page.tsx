import { RequestPreparationScreen } from "@/modules/pressure-test/ui/request-preparation-screen"

export default function ItemClearancePage() {
  return <RequestPreparationScreen requestType="item_clearance" progressHref="/testpack/pressure-test/item-clearance/progress" />
}
