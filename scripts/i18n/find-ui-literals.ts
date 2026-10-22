// scripts/i18n/find-ui-literals.ts
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"

export interface UiLiteral {
  file: string
  line: number
  text: string
}

/** JSX attributes a person reads or hears. Every other attribute is markup. */
const TEXT_ATTRIBUTES = new Set([
  "title", "placeholder", "aria-label", "aria-description", "aria-valuetext", "alt", "label",
  "description", "detail", "emptyMessage", "tooltip", "subtitle", "heading", "completedLabel",
])

/** Calls whose string arguments are never shown: class names, keys, queries, logging, errors. */
const SILENT_CALLS = new Set([
  "cn", "clsx", "cva", "twMerge", "t", "useTranslations", "getTranslations", "require",
  "select", "from", "eq", "neq", "in", "is", "order", "rpc", "match", "getItem", "setItem",
  "removeItem", "querySelector", "querySelectorAll", "addEventListener", "removeEventListener",
  "split", "join", "replace", "startsWith", "endsWith", "includes", "padStart", "padEnd",
  "get", "set", "has", "delete", "append", "test", "push", "Error", "TypeError", "RangeError",
])

/** Product names that read the same in every language. */
const NAMES = new Set(["PipeQC", "SpoolGen", "AVEVA E3D / PDMS", "Smart 3D / CADWorx", "Plant 3D", "Excel"])

/** A Tailwind-like token: lowercase, digits and the punctuation class names use. */
const CSS_TOKEN = /^[!a-z0-9[\]&>_:/.%()=,'#*+-]+$/

/** Text a person reads: a sentence, or one capitalised word. Codes, keys and class lists are not. */
export function looksLikeProse(raw: string): boolean {
  const text = raw.replace(/\s+/g, " ").trim()
  if (!/[A-Za-z]{2,}/.test(text) || NAMES.has(text)) return false
  const tokens = text.split(" ")
  if (tokens.every((token) => CSS_TOKEN.test(token)) && tokens.some((token) => /[-:[]/.test(token))) return false
  if (tokens.length > 1) return true
  return /^[A-Z][a-z]/.test(text)
}

function calleeName(expression: ts.Expression): string {
  if (ts.isIdentifier(expression)) return expression.text
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text
  return ""
}

function isConsole(expression: ts.Expression): boolean {
  return ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) && expression.expression.text === "console"
}

const COMPARISONS = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword,
])

/** Positions where a string is code, not text: imports, types, keys, comparisons, markup, silent calls. */
function isSilentPosition(node: ts.Node): boolean {
  const parent = node.parent
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent)) return true
  if (ts.isLiteralTypeNode(parent) || ts.isExpressionStatement(parent) || ts.isCaseClause(parent)) return true
  if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isEnumMember(parent)) && parent.name === node) return true
  if (ts.isComputedPropertyName(parent)) return true
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true
  if (ts.isBinaryExpression(parent) && COMPARISONS.has(parent.operatorToken.kind)) return true
  for (let current: ts.Node = node; current.parent; current = current.parent) {
    const up = current.parent
    if (ts.isJsxAttribute(up)) return !TEXT_ATTRIBUTES.has(up.name.getText())
    if (ts.isJsxElement(up) || ts.isJsxSelfClosingElement(up) || ts.isJsxFragment(up)) return false
    if ((ts.isCallExpression(up) || ts.isNewExpression(up)) && up.arguments?.some((argument) => argument === current)) {
      return SILENT_CALLS.has(calleeName(up.expression)) || isConsole(up.expression)
    }
    if (ts.isTaggedTemplateExpression(up)) return true
    if (ts.isFunctionLike(up) || ts.isSourceFile(up)) return false
  }
  return false
}

export function findUiLiteralsInSource(file: string, source: string): UiLiteral[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const lines = source.split("\n")
  const found: UiLiteral[] = []
  const report = (position: number, text: string) => {
    const line = sourceFile.getLineAndCharacterOfPosition(position).line
    if (lines[line]?.includes("i18n-ignore") || lines[line - 1]?.includes("i18n-ignore")) return
    if (looksLikeProse(text)) found.push({ file, line: line + 1, text: text.replace(/\s+/g, " ").trim() })
  }
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      report(node.getStart(sourceFile) + (node.text.length - node.text.trimStart().length), node.text)
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isSilentPosition(node)) {
      report(node.getStart(sourceFile), node.text)
    } else if (ts.isTemplateExpression(node) && !isSilentPosition(node)) {
      report(node.getStart(sourceFile), node.head.text + node.templateSpans.map((span) => `0${span.literal.text}`).join(""))
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

/** Every `.ts`/`.tsx` file under `paths` (files or folders, relative to `root`), tests excluded. */
export function findUiLiterals(paths: readonly string[], root = process.cwd()): UiLiteral[] {
  const files: string[] = []
  const collect = (path: string) => {
    if (statSync(join(root, path)).isDirectory()) {
      for (const entry of readdirSync(join(root, path))) collect(join(path, entry))
    } else if (/\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.endsWith(".d.ts")) {
      files.push(path)
    }
  }
  paths.forEach(collect)
  return files.flatMap((file) => findUiLiteralsInSource(file, readFileSync(join(root, file), "utf8")))
}
