'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rateMD } from '@/app/md/actions'

interface Props {
  mdId: string
  initialMyStars: number | null
  avgStars: number
  ratingCount: number
  canRate: boolean
}

export function RatingWidget({ mdId, initialMyStars, avgStars, ratingCount, canRate }: Props) {
  const [myStars, setMyStars] = useState<number | null>(initialMyStars)
  const [hover, setHover] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(stars: number) {
    setError(null)
    setMyStars(stars)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('md_id', mdId)
      fd.set('stars', String(stars))
      const res = await rateMD(fd)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Rating</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {ratingCount > 0 ? `${Number(avgStars).toFixed(2)} (${ratingCount})` : 'No ratings yet'}
        </span>
      </div>

      {canRate ? (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover ?? myStars ?? 0) >= n
            return (
              <button
                key={n}
                type="button"
                disabled={pending}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onClick={() => submit(n)}
                className="rounded p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
                aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
              >
                <Star
                  className={cn(
                    'h-6 w-6',
                    active ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'
                  )}
                />
              </button>
            )
          })}
          {myStars && (
            <span className="ml-2 text-xs text-muted-foreground">Your rating: {myStars}</span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          You can&apos;t rate your own markdown.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
