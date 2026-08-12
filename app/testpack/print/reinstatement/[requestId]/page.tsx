import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"
import { resolvePrintRequestId } from "@/modules/pressure-test/ui/print-route-params"

export default async function ReinstatementPrintPage({ params }: { params: Promise<{ requestId: string }> }) {
  return <RequestPrintView title="Reinstatement Form" requestId={await resolvePrintRequestId(params)} expectedType="reinstatement" />
}
