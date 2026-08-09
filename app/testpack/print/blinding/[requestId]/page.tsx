import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"

export default function BlindingPrintPage({ params }: { params: { requestId: string } }) {
  return <RequestPrintView title="Blinding Form" requestId={params.requestId} expectedType="blinding" />
}
