import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RemoveMemberButton } from './RemoveMemberButton'
import { AddMemberForm } from '@/components/AddMemberForm'
import { ChangeLeadForm } from '@/components/ChangeLeadForm'

export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage({ params }: { params: { teamId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, description, lead_id, company_id')
    .eq('id', params.teamId)
    .single()
  if (!team) notFound()

  const { data: selfProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = selfProfile?.role === 'admin'
  if (team.lead_id !== user.id && !isAdmin) redirect(`/teams/${team.id}`)

  const { data: members } = await supabase
    .from('team_members')
    .select('id, user_id, joined_at, user:profiles(id, display_name, role)')
    .eq('team_id', team.id)
    .order('joined_at', { ascending: true })

  const memberIds = new Set((members ?? []).map((m: any) => m.user_id))

  const { data: companyUsers } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('company_id', team.company_id)
    .order('display_name')

  const candidates = (companyUsers ?? []).filter((u: any) => !memberIds.has(u.id)) as Array<{
    id: string
    display_name: string
    role: string
  }>

  const allCompanyUsers = (companyUsers ?? []) as Array<{
    id: string
    display_name: string
    role: string
  }>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{team.name} — Settings</h1>
        <p className="text-sm text-muted-foreground">Lead-only controls.</p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Change lead</CardTitle>
              <Badge variant="secondary" className="text-xs">admin</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChangeLeadForm
              teamId={team.id}
              currentLeadId={team.lead_id}
              members={allCompanyUsers}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add member</CardTitle>
        </CardHeader>
        <CardContent>
          <AddMemberForm teamId={team.id} candidates={candidates} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {(members ?? []).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.user?.display_name ?? 'unknown'}</span>
                    {m.user_id === team.lead_id && (
                      <Badge variant="outline" className="text-xs">lead</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.user?.role} · joined {new Date(m.joined_at).toLocaleDateString()}
                  </div>
                </div>
                {m.user_id !== team.lead_id && (
                  <RemoveMemberButton teamId={team.id} userId={m.user_id} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
