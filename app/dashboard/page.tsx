import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, PlusCircle, Users } from 'lucide-react'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MDCard, type MDCardData } from '@/components/MDCard'
import { SearchInput } from '@/components/SearchInput'
import type { MDTag } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const q = (searchParams.q ?? '').trim().toLowerCase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role, company:companies(id, name)')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('team_members')
    .select('team:teams(id, name, description)')
    .eq('user_id', user.id)

  const myTeams =
    (memberships ?? [])
      .map((m) => (m as any).team)
      .filter((t: any): t is { id: string; name: string; description: string | null } => !!t) ?? []
  const teamIds = myTeams.map((t) => t.id)
  const teamNameById = new Map(myTeams.map((t) => [t.id, t.name]))

  let recent: MDCardData[] = []
  if (teamIds.length > 0) {
    let query = supabase
      .from('markdown_files')
      .select(
        `id, team_id, title, readme, tags, updated_at, author_id,
         author:profiles(id, display_name),
         team:teams(name)`
      )
      .in('team_id', teamIds)
      .order('updated_at', { ascending: false })

    if (q) {
      query = query.or(`title.ilike.%${q}%,readme.ilike.%${q}%`)
    }

    const { data: mds } = await query.limit(20)

    const mdIds = (mds ?? []).map((m) => m.id)
    const authorIds = Array.from(new Set((mds ?? []).map((m) => m.author_id)))

    const [{ data: grades }, { data: ratings }] = await Promise.all([
      authorIds.length > 0
        ? supabase
            .from('user_grades')
            .select('user_id, coworker_grade, total_ratings')
            .in('user_id', authorIds)
        : Promise.resolve({ data: [] as any[] }),
      mdIds.length > 0
        ? supabase
            .from('md_rating_summary')
            .select('md_id, avg_stars, rating_count')
            .in('md_id', mdIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const gradeMap = new Map<string, { coworker_grade: number; total_ratings: number }>()
    for (const g of grades ?? []) {
      gradeMap.set(g.user_id, { coworker_grade: Number(g.coworker_grade), total_ratings: g.total_ratings })
    }
    const ratingMap = new Map<string, { avg_stars: number; rating_count: number }>()
    for (const r of ratings ?? []) {
      ratingMap.set(r.md_id, { avg_stars: Number(r.avg_stars), rating_count: r.rating_count })
    }

    recent = (mds ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      readme: m.readme,
      tags: m.tags as MDTag[],
      team_name: m.team?.name ?? teamNameById.get(m.team_id) ?? null,
      updated_at: m.updated_at,
      author: m.author ? { id: m.author.id, display_name: m.author.display_name } : null,
      authorGrade: m.author_id ? gradeMap.get(m.author_id) ?? null : null,
      rating: ratingMap.get(m.id) ?? null,
    }))
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{(profile as any)?.company?.name ?? ''}</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.display_name}.
        </h1>
      </div>

      <section className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="shrink-0 text-lg font-semibold">
              {q ? 'Search results' : 'Recent across your teams'}
            </h2>
            <Suspense>
              <SearchInput />
            </Suspense>
          </div>
          {recent.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                {q ? `No markdowns found for "${q}".` : 'No MDs yet. Join a team or write your first one.'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recent.map((md) => (
                <MDCard key={md.id} md={md} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                My teams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myTeams.length === 0 ? (
                <p className="text-sm text-muted-foreground">You aren&apos;t in any teams yet.</p>
              ) : (
                myTeams.map((t) => (
                  <Link
                    key={t.id}
                    href={`/teams/${t.id}`}
                    className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-accent"
                  >
                    <span className="font-medium">{t.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href="/teams">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Browse teams
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}
