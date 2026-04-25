import { cn } from '@/lib/utils'
import type { MDTag } from '@/lib/types'

const COLOR: Record<MDTag, string> = {
  skill: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
  rule: 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200',
  prompt: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  sop: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  other: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200',
}

export function TagPill({ tag, className }: { tag: MDTag; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        COLOR[tag],
        className
      )}
    >
      {tag}
    </span>
  )
}
