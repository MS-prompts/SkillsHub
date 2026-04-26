import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { PlusCircle, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MDCard, type MDCardData } from '@/components/MDCard'
import { TagPill } from '@/components/TagPill'
import { MD_TAGS, type MDTag } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: { teamId: string }
  searchParams: { tag?: string; sort?: 'recent' | 'top'; author?: string }
}

export default async function TeamPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, description, lead_id')
    .eq('id', params.teamId)
    .single()
  if (!team) notFound()

  const { data: membership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', team.id)
    .eq('user_id', user.id)
    .maybeSingle()
  const isMember = !!membership
  const isLead = team.lead_id === user.id

  const { data: mds } = await supabase
    .from('markdown_files')
    .select(
      `id, title, readme, tags, updated_at, author_id,
       author:profiles(id, display_name)`
    )
    .eq('team_id', team.id)

  const mdIds = (mds ?? []).map((m: any) => m.id)
  const { data: ratings } =
    mdIds.length > 0
      ? await supabase
          .from('md_rating_summary')
          .select('md_id, avg_stars, rating_count')
          .in('md_id', mdIds)
      : { data: [] as any[] }
  const ratingMap = new Map<string, { avg_stars: number; rating_count: number }>()
  for (const r of ratings ?? []) {
    ratingMap.set(r.md_id, { avg_stars: Number(r.avg_stars), rating_count: r.rating_count })
  }

  let filtered = ((mds ?? []) as any[]).map((m) => ({
    ...m,
    rating: ratingMap.get(m.id) ?? null,
  }))
  const tagFilter = searchParams.tag as MDTag | undefined
  if (tagFilter && MD_TAGS.includes(tagFilter)) {
    filtered = filtered.filter((m) => (m.tags as MDTag[]).includes(tagFilter))
  }
  if (searchParams.author) {
    filtered = filtered.filter((m) => m.author?.id === searchParams.author)
  }
  const sort = searchParams.sort ?? 'recent'
  if (sort === 'top') {
    filtered.sort(
      (a, b) => Number(b.rating?.avg_stars ?? 0) - Number(a.rating?.avg_stars ?? 0)
    )
  } else {
    filtered.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
  }

  const authorIds = Array.from(new Set(filtered.map((m) => m.author_id)))
  const { data: grades } =
    authorIds.length > 0
      ? await supabase
          .from('user_grades')
          .select('user_id, coworker_grade, total_ratings')
          .in('user_id', authorIds)
      : { data: [] as any[] }
  const gradeMap = new Map<string, { coworker_grade: number; total_ratings: number }>()
  for (const g of grades ?? []) {
    gradeMap.set(g.user_id, { coworker_grade: Number(g.coworker_grade), total_ratings: g.total_ratings })
  }

  const cards: MDCardData[] = filtered.map((m) => ({
    id: m.id,
    title: m.title,
    readme: m.readme,
    tags: m.tags as MDTag[],
    updated_at: m.updated_at,
    author: m.author ? { id: m.author.id, display_name: m.author.display_name } : null,
    authorGrade: m.author_id ? gradeMap.get(m.author_id) ?? null : null,
    rating: m.rating,
  }))

  const authorOptions: Array<{ id: string; name: string }> = []
  const seen = new Set<string>()
  for (const m of mds ?? []) {
    const a = (m as any).author
    if (a && !seen.has(a.id)) {
      seen.add(a.id)
      authorOptions.push({ id: a.id, name: a.display_name })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          {team.description && (
            <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {isLead && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/teams/${team.id}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          )}
          {isMember && (
            <Button asChild size="sm">
              <Link href={`/teams/${team.id}/compose`}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Share new MD
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <span className="text-muted-foreground">Tag:</span>
        <Link
          href={`/teams/${team.id}?sort=${sort}${searchParams.author ? `&author=${searchParams.author}` : ''}`}
          className={`rounded-full border px-2 py-0.5 text-xs ${!tagFilter ? 'border-foreground bg-foreground text-background' : 'hover:bg-accent'}`}
        >
          all
        </Link>
        {MD_TAGS.map((tg) => (
          <Link
            key={tg}
            href={`/teams/${team.id}?tag=${tg}&sort=${sort}${searchParams.author ? `&author=${searchParams.author}` : ''}`}
          >
            <TagPill
              tag={tg}
              className={tagFilter === tg ? 'ring-2 ring-foreground ring-offset-1' : ''}
            />
          </Link>
        ))}
        <span className="ml-4 text-muted-foreground">Sort:</span>
        <Link
          href={`/teams/${team.id}?sort=recent${tagFilter ? `&tag=${tagFilter}` : ''}${searchParams.author ? `&author=${searchParams.author}` : ''}`}
          className={`rounded-full border px-2 py-0.5 text-xs ${sort === 'recent' ? 'border-foreground bg-foreground text-background' : 'hover:bg-accent'}`}
        >
          recent
        </Link>
        <Link
          href={`/teams/${team.id}?sort=top${tagFilter ? `&tag=${tagFilter}` : ''}${searchParams.author ? `&author=${searchParams.author}` : ''}`}
          className={`rounded-full border px-2 py-0.5 text-xs ${sort === 'top' ? 'border-foreground bg-foreground text-background' : 'hover:bg-accent'}`}
        >
          top-rated
        </Link>
        {searchParams.author && (
          <Link
            href={`/teams/${team.id}?sort=${sort}${tagFilter ? `&tag=${tagFilter}` : ''}`}
            className="ml-4 text-xs text-muted-foreground underline"
          >
            clear author filter
          </Link>
        )}
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {(mds ?? []).length === 0 ? 'No MDs in this team yet.' : 'No MDs match your filters.'}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-1">
          {cards.map((md) => (
            <MDCard key={md.id} md={md} />
          ))}
        </div>
      )}
    </div>
  )
}
