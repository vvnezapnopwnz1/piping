import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"

export default function LineCheckPrintPage({ params }: { params: { requestId: string } }) {
  return <RequestPrintView title="Line Check Form" requestId={params.requestId} expectedType="line_check" />
}
