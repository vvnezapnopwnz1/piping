import { useTranslations } from 'next-intl'
import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const tu = useTranslations('common.ui')
  return (
    <Loader2Icon
      role="status"
      aria-label={tu('loading')}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
