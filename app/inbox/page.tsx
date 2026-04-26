import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Inbox as InboxIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
import {
  PendingApprovals,
  type PendingJoin,
  type PendingCrossTeam,
} from '@/components/PendingApprovals'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Opening inbox marks incoming notifications as seen.
  await supabase
    .from('direct_shares')
    .update({ seen: true })
    .eq('recipient_id', user.id)
    .eq('seen', false)

  const { data: shares } = await supabase
    .from('direct_shares')
    .select(
      `id, message, seen, created_at, md:markdown_files(id, title),
       sender:profiles!direct_shares_sender_id_fkey(id, display_name)`
    )
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  const { data: myMds } = await supabase
    .from('markdown_files')
    .select('id, title')
    .eq('author_id', user.id)

  const myMdIds = (myMds ?? []).map((m) => m.id)
  const mdTitles = new Map((myMds ?? []).map((m) => [m.id, m.title]))
  const { data: ratingNotifications } =
    myMdIds.length > 0
      ? await supabase
          .from('md_feedback')
          .select(
            `id, md_id, stars, comment, author_seen, created_at,
             rater:profiles!md_feedback_user_id_fkey(id, display_name)`
          )
          .in('md_id', myMdIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
      : { data: [] as any[] }

  if (myMdIds.length > 0) {
    await supabase
      .from('md_feedback')
      .update({ author_seen: true })
      .in('md_id', myMdIds)
      .neq('user_id', user.id)
      .eq('author_seen', false)
  }

  const { data: ledTeams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('lead_id', user.id)
  const isAnyLead = (ledTeams ?? []).length > 0
  const ledTeamIds = (ledTeams ?? []).map((t) => t.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  // Admins see all company teams; leads only see their led teams.
  let effectiveTeamIds = ledTeamIds
  if (isAdmin) {
    const { data: allTeams } = await supabase.from('teams').select('id')
    effectiveTeamIds = (allTeams ?? []).map((t) => t.id)
  }

  const shouldShowApprovals = isAnyLead || isAdmin

  let joinReqs: PendingJoin[] = []
  let crossReqs: PendingCrossTeam[] = []

  if (shouldShowApprovals && effectiveTeamIds.length > 0) {
    const { data: jrs } = await supabase
      .from('join_requests')
      .select(
        `id, team_id, user_id, message, created_at,
         team:teams(id, name),
         user:profiles(id, display_name)`
      )
      .in('team_id', effectiveTeamIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    joinReqs = (jrs ?? []) as any

    const { data: ctrs } = await supabase
      .from('cross_team_requests')
      .select(
        `id, md_id, from_team_id, to_team_id, requested_by, created_at,
         md:markdown_files(id, title),
         from_team:teams!cross_team_requests_from_team_id_fkey(id, name),
         to_team:teams!cross_team_requests_to_team_id_fkey(id, name),
         requester:profiles!cross_team_requests_requested_by_fkey(id, display_name)`
      )
      .in('to_team_id', effectiveTeamIds)
      .eq('status', 'pending')
      .neq('requested_by', user.id)
      .order('created_at', { ascending: false })
    crossReqs = (ctrs ?? []) as any
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <InboxIcon className="h-7 w-7" />
          Inbox
        </h1>
      </div>

      {shouldShowApprovals && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pending approvals</h2>
          <PendingApprovals joinRequests={joinReqs} crossTeamRequests={crossReqs} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Direct shares</h2>
        {(shares ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No direct shares yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {(shares ?? []).map((s: any) => (
                <div
                  key={s.id}
                  className={`flex items-start justify-between gap-3 p-4 ${
                    !s.seen ? 'bg-accent/40' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/md/${s.md?.id ?? ''}`}
                      className="font-medium hover:underline"
                    >
                      {s.md?.title ?? 'a markdown'}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      from {s.sender?.display_name ?? 'someone'} ·{' '}
                      {formatRelativeTime(s.created_at)}
                    </div>
                    {s.message && <p className="mt-1 text-sm">{s.message}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ratings on your MDs</h2>
        {(ratingNotifications ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No ratings yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {(ratingNotifications ?? []).map((r: any) => (
                <div
                  key={r.id}
                  className={`flex items-start justify-between gap-3 p-4 ${
                    !r.author_seen ? 'bg-accent/40' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <Link href={`/md/${r.md_id}`} className="font-medium hover:underline">
                      {mdTitles.get(r.md_id) ?? 'your markdown'}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      rated {r.stars}/5 by {r.rater?.display_name ?? 'someone'} ·{' '}
                      {formatRelativeTime(r.created_at)}
                    </div>
                    {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

    </div>
  )
}
