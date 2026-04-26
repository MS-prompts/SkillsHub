import Link from 'next/link'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TagPill } from './TagPill'
import { CoworkerGradeBadge } from './CoworkerGradeBadge'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { MDTag } from '@/lib/types'

export interface MDCardData {
  id: string
  title: string
  readme: string | null
  tags: MDTag[]
  team_name?: string | null
  updated_at: string
  author: { id: string; display_name: string } | null
  authorGrade?: { coworker_grade: number; total_ratings: number } | null
  rating?: { avg_stars: number; rating_count: number } | null
}

const TAG_DOT: Record<MDTag, string> = {
  agents:  'bg-emerald-500',
  claude:  'bg-orange-500',
  cursor:  'bg-violet-500',
  skill:   'bg-blue-500',
  prompt:  'bg-cyan-500',
  memory:  'bg-amber-500',
  context: 'bg-indigo-500',
  other:   'bg-slate-400',
}

export function MDCard({ md }: { md: MDCardData }) {
  const ratingCount = md.rating?.rating_count ?? 0
  const avgStars = md.rating?.avg_stars ?? 0
  const firstTag = md.tags?.[0]
  const dotColor = firstTag ? TAG_DOT[firstTag] : 'bg-muted-foreground/40'

  return (
    <div className="group relative">
      <Link href={`/md/${md.id}`}>
        <Card className="transition-colors hover:border-foreground/30 hover:bg-accent/40">
          <CardContent className="px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColor)} />

              <span className="flex-1 truncate text-sm font-medium group-hover:underline">
                {md.title}
              </span>

              <div className="hidden shrink-0 items-center gap-1.5 md:flex">
                {md.team_name && (
                  <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
                    {md.team_name}
                  </span>
                )}
                {md.tags.slice(0, 2).map((t) => (
                  <TagPill key={t} tag={t} />
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {md.author && (
                  <span className="hidden font-medium text-foreground/80 lg:inline">
                    {md.author.display_name}
                  </span>
                )}
                {md.authorGrade && (
                  <CoworkerGradeBadge
                    grade={md.authorGrade.coworker_grade}
                    totalRatings={md.authorGrade.total_ratings}
                  />
                )}
                {ratingCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span className="tabular-nums">{Number(avgStars).toFixed(1)}</span>
                  </span>
                )}
                <span className="shrink-0">{formatRelativeTime(md.updated_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {md.readme && (
        <div className="pointer-events-none absolute left-full top-0 z-50 ml-2 w-72 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <Card className="shadow-lg">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-semibold">{md.title}</p>
              <p className="line-clamp-4 text-xs text-muted-foreground">{md.readme}</p>
              {md.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {md.tags.map((t) => (
                    <TagPill key={t} tag={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
