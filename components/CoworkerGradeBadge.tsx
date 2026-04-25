import { Star } from 'lucide-react'
import { cn, formatGrade } from '@/lib/utils'

interface Props {
  grade: number
  totalRatings: number
  size?: 'sm' | 'lg'
  className?: string
}

export function CoworkerGradeBadge({ grade, totalRatings, size = 'sm', className }: Props) {
  const isEmpty = totalRatings === 0
  return (
    <span
      title={isEmpty ? 'No ratings yet' : `${formatGrade(grade, totalRatings)} from ${totalRatings} rating${totalRatings === 1 ? '' : 's'}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border bg-muted/40 font-medium tabular-nums',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-base',
        className
      )}
    >
      <Star className={cn('fill-amber-500 text-amber-500', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {formatGrade(grade, totalRatings)}
    </span>
  )
}
