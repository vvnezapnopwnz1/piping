import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"

export default function ReinstatementPrintPage({ params }: { params: { requestId: string } }) {
  return <RequestPrintView title="Reinstatement Form" requestId={params.requestId} expectedType="reinstatement" />
}
