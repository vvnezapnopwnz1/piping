import { getTranslations } from "next-intl/server"
import { RequestPrintView } from "@/modules/pressure-test/ui/request-print-view"
import { resolvePrintRequestId } from "@/modules/pressure-test/ui/print-route-params"

export default async function ItemClearancePrintPage({ params }: { params: Promise<{ requestId: string }> }) {
  const t = await getTranslations("testPack.print")
  return <RequestPrintView title={t("itemClearance")} requestId={await resolvePrintRequestId(params)} expectedType="item_clearance" />
}
