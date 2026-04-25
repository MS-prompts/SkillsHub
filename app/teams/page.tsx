import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinRequestForm } from '@/components/JoinRequestForm'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, description, lead:profiles!teams_lead_id_fkey(id, display_name)')
    .order('name')

  const { data: myMemberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
  const memberTeamIds = new Set((myMemberships ?? []).map((m) => m.team_id))

  const { data: pendingReqs } = await supabase
    .from('join_requests')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
  const pendingTeamIds = new Set((pendingReqs ?? []).map((r) => r.team_id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">All teams in your company.</p>
        </div>
      </div>

      {(!teams || teams.length === 0) ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No teams in your company yet. An admin needs to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {teams.map((t: any) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      <Link href={`/teams/${t.id}`} className="hover:underline">
                        {t.name}
                      </Link>
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Lead: {t.lead?.display_name ?? 'unassigned'}
                    </p>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {t.description && (
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                )}
                <JoinRequestForm
                  teamId={t.id}
                  alreadyMember={memberTeamIds.has(t.id)}
                  alreadyRequested={pendingTeamIds.has(t.id)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
