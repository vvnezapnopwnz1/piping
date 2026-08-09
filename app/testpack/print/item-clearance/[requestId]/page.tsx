import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"

export default function ItemClearancePrintPage({ params }: { params: { requestId: string } }) {
  return <RequestPrintView title="Item Clearance Form" requestId={params.requestId} expectedType="item_clearance" />
}
