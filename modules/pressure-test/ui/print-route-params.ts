export async function resolvePrintRequestId(params: Promise<{ requestId: string }>): Promise<string> {
  return (await params).requestId
}
