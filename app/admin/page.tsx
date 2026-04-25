import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateTeamForm } from './CreateTeamForm'
import { CreateUserForm } from './CreateUserForm'
import { UserRoleSelect } from './UserRoleSelect'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: selfProfile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!selfProfile || selfProfile.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('company_id', selfProfile.company_id)
    .order('display_name')

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, description, lead:profiles!teams_lead_id_fkey(display_name)')
    .order('name')

  const userList = (users ?? []) as Array<{ id: string; display_name: string; role: string }>
  const teamList = (teams ?? []) as Array<{
    id: string
    name: string
    description: string | null
    lead: { display_name: string } | null
  }>

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">Manage teams and users.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Create user */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create user</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm />
          </CardContent>
        </Card>

        {/* Create team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create team</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateTeamForm users={userList} />
          </CardContent>
        </Card>

        {/* Existing teams */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teams ({teamList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {teamList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams yet.</p>
            ) : (
              <div className="divide-y">
                {teamList.map((t) => (
                  <div key={t.id} className="py-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Lead: {t.lead?.display_name ?? 'unassigned'}
                      {t.description && ` · ${t.description}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users ({userList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {userList.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{u.display_name}</span>
                  {u.id === user.id && (
                    <Badge variant="secondary" className="text-xs">you</Badge>
                  )}
                </div>
                <UserRoleSelect
                  userId={u.id}
                  currentRole={u.role}
                  isSelf={u.id === user.id}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
