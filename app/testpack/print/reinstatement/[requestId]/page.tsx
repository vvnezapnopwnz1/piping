import { getTranslations } from "next-intl/server"
import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"
import { resolvePrintRequestId } from "@/modules/pressure-test/ui/print-route-params"

export default async function ReinstatementPrintPage({ params }: { params: Promise<{ requestId: string }> }) {
  const t = await getTranslations("testPack.print")
  return <RequestPrintView title={t("reinstatement")} requestId={await resolvePrintRequestId(params)} expectedType="reinstatement" />
}
