"use client"

import type { ReactNode } from "react"
import { Check, ChevronDown, ChevronRight, Circle, Lock } from "lucide-react"

import type { PackStep, StepId } from "../domain/pack-steps"
import { useTestPackTranslations } from "./test-pack-i18n"

/** The pack header is this tall; the open step's header sticks right below it. */
export const PACK_HEADER_HEIGHT_PX = 76

export function StepCard({
  step,
  index,
  open,
  current,
  onToggle,
  children,
}: {
  step: PackStep
  index: number
  open: boolean
  current: boolean
  onToggle: () => void
  children?: ReactNode
}) {
  const t = useTestPackTranslations()
  const note = step.state === "blocked" && step.reasons.length > 0 ? step.reasons.map((item) => t(item.key, item.values)).join(", ") : step.summary ? t(step.summary.key, step.summary.values) : ""
  const tone = open ? (current ? "bg-primary text-primary-foreground" : "bg-emerald-700 text-white") : ""
  return (
    <li className={`rounded-lg border ${current ? "border-primary" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 p-3 text-left ${open ? `sticky top-[76px] z-10 rounded-t-lg shadow-sm ${tone}` : ""}`}
      >
        <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border text-xs ${open ? "border-white/60 bg-white text-foreground" : ""}`}>
          {step.state === "done" ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : step.state === "blocked" ? <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> : current ? <Circle className="h-3 w-3 fill-primary text-primary" aria-hidden="true" /> : index + 1}
        </span>
        <span className={`flex-1 ${step.state === "blocked" && !open ? "text-muted-foreground" : ""}`}>
          <span className="font-medium">{t(`steps.title.${step.id}`)}</span>
          {note && <span className={`ml-2 text-sm ${open ? "opacity-80" : "text-muted-foreground"}`}>{note}</span>}
        </span>
        {open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
      </button>
      {open && <div className="space-y-4 border-t p-3">{children}</div>}
    </li>
  )
}

export function PackSteps({
  steps,
  currentId,
  openId,
  onOpen,
  renderBody,
}: {
  steps: readonly PackStep[]
  currentId: StepId | null
  openId: StepId | null
  onOpen: (id: StepId | null) => void
  renderBody: (step: PackStep) => ReactNode
}) {
  return (
    <ol className="space-y-2 p-4">
      {steps.map((step, index) => (
        <StepCard key={step.id} step={step} index={index} open={openId === step.id} current={currentId === step.id} onToggle={() => onOpen(openId === step.id ? null : step.id)}>
          {renderBody(step)}
        </StepCard>
      ))}
    </ol>
  )
}
