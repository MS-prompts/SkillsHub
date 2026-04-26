import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CoworkerGradeBadge } from '@/components/CoworkerGradeBadge'
import { MDCard, type MDCardData } from '@/components/MDCard'
import { Badge } from '@/components/ui/badge'
import type { MDTag } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', params.userId)
    .single()
  if (!profile) notFound()

  const { data: gradeRow } = await supabase
    .from('user_grades')
    .select('coworker_grade, total_ratings, md_count')
    .eq('user_id', profile.id)
    .maybeSingle()
  const grade = gradeRow ? Number(gradeRow.coworker_grade) : 0
  const totalRatings = gradeRow?.total_ratings ?? 0
  const mdCount = gradeRow?.md_count ?? 0

  const { data: mds } = await supabase
    .from('markdown_files')
    .select(
      `id, title, readme, tags, updated_at, author_id,
       author:profiles(id, display_name)`
    )
    .eq('author_id', profile.id)
    .order('updated_at', { ascending: false })

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

  const cards: MDCardData[] = (mds ?? []).map((m: any) => ({
    id: m.id,
    title: m.title,
    readme: m.readme,
    tags: m.tags as MDTag[],
    updated_at: m.updated_at,
    author: m.author ? { id: m.author.id, display_name: m.author.display_name } : null,
    authorGrade: { coworker_grade: grade, total_ratings: totalRatings },
    rating: ratingMap.get(m.id) ?? null,
  }))

  const initials = profile.display_name
    .split(/\s+/)
    .map((p: string) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{profile.display_name}</h1>
              <Badge variant="outline">{profile.role}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{mdCount} MD{mdCount === 1 ? '' : 's'}</span>
              <span>·</span>
              <span>{totalRatings} rating{totalRatings === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Coworker Grade</div>
            <CoworkerGradeBadge grade={grade} totalRatings={totalRatings} size="lg" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">MDs by {profile.display_name}</h2>
        {cards.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No MDs you can see.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-1">
            {cards.map((md) => (
              <MDCard key={md.id} md={md} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
