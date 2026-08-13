'use client'

import * as React from 'react'
import {
  CheckCircle2,
  CircleDashed,
  CircleDot,
  TriangleAlert,
  XCircle,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { statusLabel, statusTone, type StatusTone } from './status-tone'

/**
 * Every tone carries an icon as well as a colour. A worklist is scanned, not read, and colour
 * alone leaves out the eight percent of men who cannot separate the green one from the red one —
 * on a screen whose whole job is telling accepted joints from rejected ones.
 */
const TONE_STYLES: Record<StatusTone, { className: string; Icon: React.ElementType }> = {
  success: {
    className: 'bg-success-bg text-success-fg border-success-border',
    Icon: CheckCircle2,
  },
  warning: {
    className: 'bg-warning-bg text-warning-fg border-warning-border',
    Icon: TriangleAlert,
  },
  info: {
    className: 'bg-info-bg text-info-fg border-info-border',
    Icon: CircleDot,
  },
  danger: {
    className: 'bg-danger-bg text-danger-fg border-danger-border',
    Icon: XCircle,
  },
  neutral: {
    className: 'bg-neutral-bg text-neutral-fg border-neutral-border',
    Icon: CircleDashed,
  },
}

export function StatusBadge({
  status,
  tone,
  label,
  icon = true,
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & {
  /** Domain status straight from the row. Decides both the tone and the label unless overridden. */
  status: string | null | undefined
  /** Override when the status word does not map to the tone the screen means. */
  tone?: StatusTone
  /** Override when the operator's word for this status is not the database's word. */
  label?: React.ReactNode
  /** Drop the icon only where the row already carries the same meaning some other way. */
  icon?: boolean
}) {
  const resolved = tone ?? statusTone(status)
  const { className: toneClassName, Icon } = TONE_STYLES[resolved]

  return (
    <span
      data-slot="status-badge"
      data-tone={resolved}
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        '[&>svg]:pointer-events-none [&>svg]:size-3',
        toneClassName,
        className,
      )}
      {...props}
    >
      {icon ? <Icon aria-hidden="true" /> : null}
      {label ?? statusLabel(status)}
    </span>
  )
}

export { statusTone, statusLabel, type StatusTone }
