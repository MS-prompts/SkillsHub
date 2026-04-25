import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MDComposer } from '@/components/MDComposer'

export const dynamic = 'force-dynamic'

export default async function ComposePage({ params }: { params: { teamId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', params.teamId)
    .single()
  if (!team) notFound()

  const { data: membership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', team.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) {
    redirect(`/teams/${team.id}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Share new MD in {team.name}</h1>
        <p className="text-sm text-muted-foreground">
          Write your markdown, preview it, then save.
        </p>
      </div>
      <MDComposer mode="create" teams={[{ id: team.id, name: team.name }]} initial={{ team_id: team.id }} />
    </div>
  )
}
