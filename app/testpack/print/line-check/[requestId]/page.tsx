import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"
import { resolvePrintRequestId } from "@/modules/pressure-test/ui/print-route-params"

export default async function LineCheckPrintPage({ params }: { params: Promise<{ requestId: string }> }) {
  return <RequestPrintView title="Line Check Form" requestId={await resolvePrintRequestId(params)} expectedType="line_check" />
}
