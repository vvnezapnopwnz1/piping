import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"
import { resolvePrintRequestId } from "@/modules/pressure-test/ui/print-route-params"

export default async function ItemClearancePrintPage({ params }: { params: Promise<{ requestId: string }> }) {
  return <RequestPrintView title="Item Clearance Form" requestId={await resolvePrintRequestId(params)} expectedType="item_clearance" />
}
