import Link from 'next/link'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { TagPill } from './TagPill'
import { CoworkerGradeBadge } from './CoworkerGradeBadge'
import { formatRelativeTime } from '@/lib/utils'
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

export function MDCard({ md }: { md: MDCardData }) {
  const ratingCount = md.rating?.rating_count ?? 0
  const avgStars = md.rating?.avg_stars ?? 0

  return (
    <Card className="transition-colors hover:border-foreground/20">
      <CardContent className="p-5">
        <Link href={`/md/${md.id}`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold group-hover:underline">{md.title}</h3>
              {md.readme && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{md.readme}</p>
              )}
            </div>
            {ratingCount > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="tabular-nums">{Number(avgStars).toFixed(1)}</span>
                <span className="text-xs">({ratingCount})</span>
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {md.team_name && (
              <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {md.team_name}
              </span>
            )}
            {md.tags.map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {md.author && (
                <>
                  <span className="font-medium text-foreground">{md.author.display_name}</span>
                  {md.authorGrade && (
                    <CoworkerGradeBadge
                      grade={md.authorGrade.coworker_grade}
                      totalRatings={md.authorGrade.total_ratings}
                    />
                  )}
                </>
              )}
            </div>
            <span>{formatRelativeTime(md.updated_at)}</span>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}
