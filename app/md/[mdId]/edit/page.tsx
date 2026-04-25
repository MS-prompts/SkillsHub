import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MDComposer } from '@/components/MDComposer'
import type { MDTag } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditMDPage({ params }: { params: { mdId: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: md } = await supabase
    .from('markdown_files')
    .select('id, team_id, author_id, title, readme, content, tags, team:teams(id, name, lead_id)')
    .eq('id', params.mdId)
    .single()
  if (!md) notFound()

  const isAuthor = md.author_id === user.id
  const isLead = (md.team as any)?.lead_id === user.id
  if (!isAuthor && !isLead) redirect(`/md/${md.id}`)

  const teamName = (md.team as any)?.name ?? 'team'

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Edit MD</h1>
      <MDComposer
        mode="edit"
        teams={[{ id: md.team_id, name: teamName }]}
        initial={{
          id: md.id,
          title: md.title,
          readme: md.readme ?? '',
          content: md.content,
          tags: md.tags as MDTag[],
          team_id: md.team_id,
        }}
      />
    </div>
  )
}
