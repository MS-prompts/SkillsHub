import { cn } from '@/lib/utils'
import type { MDTag } from '@/lib/types'

const COLOR: Record<MDTag, string> = {
  agents: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  claude: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200',
  cursor: 'bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200',
  skill: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
  prompt: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-200',
  memory: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  context: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
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
