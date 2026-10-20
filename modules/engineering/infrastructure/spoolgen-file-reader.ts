export type SourceEncoding = "utf-8" | "utf-16le" | "windows-1251"
export interface DecodedText { text: string; encoding: SourceEncoding }
// UTF-16LE only with its BOM; otherwise UTF-8 when the bytes are valid, else the Windows Cyrillic code page. TextDecoder drops the BOM itself.
export function decodeText(bytes: Uint8Array): DecodedText {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder("utf-16le").decode(bytes), encoding: "utf-16le" }
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" } } catch { return { text: new TextDecoder("windows-1251").decode(bytes), encoding: "windows-1251" } }
}
export async function readSourceFile(file: File): Promise<DecodedText> { return decodeText(new Uint8Array(await file.arrayBuffer())) }
export async function computeFileChecksum(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
