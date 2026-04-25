import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TagPill } from '@/components/TagPill'
import { CoworkerGradeBadge } from '@/components/CoworkerGradeBadge'
import { RatingWidget } from '@/components/RatingWidget'
import { ShareDialog } from '@/components/ShareDialog'
import { SourceToggle } from '@/components/SourceToggle'
import { formatRelativeTime } from '@/lib/utils'
import type { MDTag } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MDViewPage({ params }: { params: { mdId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: md, error } = await admin
    .from('markdown_files')
    .select(
      `id, team_id, author_id, title, readme, content, tags, updated_at,
       team:teams(id, name, lead_id),
       author:profiles(id, display_name),
       visibility:md_team_visibility(team:teams(id, name))`
    )
    .eq('id', params.mdId)
    .single()

  if (error || !md) {
    console.error('[MDViewPage] md fetch failed:', { mdId: params.mdId, error })
    notFound()
  }

  const { data: ratingRow } = await admin
    .from('md_rating_summary')
    .select('avg_stars, rating_count')
    .eq('md_id', md.id)
    .maybeSingle()

  // Permission check in app code (mirrors can_view_md RLS rule)
  const { data: selfProfile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  const isAdmin = selfProfile?.role === 'admin'

  if (!isAdmin) {
    const [{ data: tm }, { data: vis }, { data: ds }] = await Promise.all([
      admin
        .from('team_members')
        .select('id')
        .eq('team_id', md.team_id)
        .eq('user_id', user.id)
        .maybeSingle(),
      admin
        .from('md_team_visibility')
        .select('team_id, team:teams!inner(id)')
        .eq('md_id', md.id),
      admin
        .from('direct_shares')
        .select('id')
        .eq('md_id', md.id)
        .eq('recipient_id', user.id)
        .maybeSingle(),
    ])
    const visTeamIds = (vis ?? []).map((v: any) => v.team_id)
    let viaShare = false
    if (visTeamIds.length > 0) {
      const { data: myShared } = await admin
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .in('team_id', visTeamIds)
        .limit(1)
      viaShare = (myShared ?? []).length > 0
    }
    const canView = !!tm || viaShare || !!ds
    console.log('[MDViewPage] perm check:', {
      user_id: user.id,
      md_id: md.id,
      md_team_id: md.team_id,
      tm: !!tm,
      viaShare,
      ds: !!ds,
      canView,
    })
    if (!canView) notFound()
  }

  const isAuthor = md.author_id === user.id
  const isLead = (md.team as any)?.lead_id === user.id

  const { data: myFeedback } = await supabase
    .from('md_feedback')
    .select('stars')
    .eq('md_id', md.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: gradeRow } = md.author_id
    ? await supabase
        .from('user_grades')
        .select('coworker_grade, total_ratings')
        .eq('user_id', md.author_id)
        .maybeSingle()
    : { data: null as any }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: coworkers } =
    profile?.company_id
      ? await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('company_id', profile.company_id)
          .neq('id', user.id)
          .order('display_name')
      : { data: [] as any[] }

  const { data: companyTeams } = profile?.company_id
    ? await supabase
        .from('teams')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .neq('id', md.team_id)
        .order('name')
    : { data: [] as Array<{ id: string; name: string }> }
  const otherTeams = (companyTeams ?? []) as Array<{ id: string; name: string }>

  const visibility = (md.visibility ?? []) as unknown as Array<{
    team: { id: string; name: string } | null
  }>
  const rating = ratingRow
  const avg = Number(rating?.avg_stars ?? 0)
  const count = rating?.rating_count ?? 0
  const author = (Array.isArray(md.author) ? md.author[0] : md.author) as
    | { id: string; display_name: string }
    | null

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{md.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {author && (
                <Link href={`/u/${author.id}`} className="font-medium text-foreground hover:underline">
                  {author.display_name}
                </Link>
              )}
              {gradeRow && (
                <CoworkerGradeBadge
                  grade={Number(gradeRow.coworker_grade)}
                  totalRatings={gradeRow.total_ratings}
                />
              )}
              <span>·</span>
              <span>updated {formatRelativeTime(md.updated_at)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(md.tags as MDTag[]).map((t) => (
                <TagPill key={t} tag={t} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <ShareDialog
              mdId={md.id}
              fromTeamId={md.team_id}
              coworkers={(coworkers ?? []) as any}
              otherTeams={otherTeams}
            />
            {(isAuthor || isLead) && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/md/${md.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-6">
            <SourceToggle content={md.content} />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          {md.readme && (
            <Card>
              <CardContent className="space-y-2 p-4">
                <h3 className="text-sm font-semibold">README</h3>
                <p className="text-sm text-muted-foreground">{md.readme}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-semibold">Owning team</h3>
                <Link
                  href={`/teams/${md.team_id}`}
                  className="text-sm text-foreground underline"
                >
                  {(md.team as any)?.name ?? 'team'}
                </Link>
              </div>

              {visibility.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold">Shared with</h3>
                    <ul className="mt-1 space-y-1">
                      {visibility.map((v, idx) => (
                        v.team ? (
                          <li key={idx}>
                            <Link
                              href={`/teams/${v.team.id}`}
                              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                            >
                              {v.team.name}
                            </Link>
                          </li>
                        ) : null
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <RatingWidget
                mdId={md.id}
                initialMyStars={myFeedback?.stars ?? null}
                avgStars={avg}
                ratingCount={count}
                canRate={!isAuthor}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
