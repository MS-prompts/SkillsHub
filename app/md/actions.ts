'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MD_TAGS } from '@/lib/types'

type Result<T = {}> = ({ ok?: boolean; error?: string } & Partial<T>)

const TagEnum = z.enum(MD_TAGS as [string, ...string[]])

const CreateMDSchema = z.object({
  team_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  readme: z.string().max(2000).optional(),
  content: z.string().min(1),
  tags: z.array(TagEnum).min(1),
})

function readTags(formData: FormData): string[] {
  return formData.getAll('tags').map((v) => String(v))
}

export async function createMD(formData: FormData): Promise<Result<{ id: string }>> {
  const raw = {
    team_id: formData.get('team_id'),
    title: formData.get('title'),
    readme: formData.get('readme') || undefined,
    content: formData.get('content'),
    tags: readTags(formData),
  }
  const parsed = CreateMDSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid markdown payload.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  let admin
  try {
    admin = createAdminClient()
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Admin client init failed.' }
  }

  // Verify membership or admin (use admin client to skip RLS — auth already verified above)
  const [{ data: membership }, { data: profile }] = await Promise.all([
    admin
      .from('team_members')
      .select('id')
      .eq('team_id', parsed.data.team_id)
      .eq('user_id', user.id)
      .maybeSingle(),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])
  const isMember = !!membership
  const isAdmin = profile?.role === 'admin'
  console.log('[createMD] auth check:', {
    user_id: user.id,
    team_id: parsed.data.team_id,
    isMember,
    isAdmin,
    profile_exists: !!profile,
  })
  if (!isMember && !isAdmin) return { error: 'You are not a member of this team.' }
  const { data, error } = await admin
    .from('markdown_files')
    .insert({
      team_id: parsed.data.team_id,
      author_id: user.id,
      title: parsed.data.title,
      readme: parsed.data.readme ?? null,
      content: parsed.data.content,
      tags: parsed.data.tags,
    })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[createMD] insert failed:', error)
    return { error: error?.message ?? 'Failed to create. Check server logs.' }
  }

  revalidatePath(`/teams/${parsed.data.team_id}`)
  revalidatePath('/dashboard')
  return { ok: true, id: data.id }
}

const UpdateMDSchema = CreateMDSchema.extend({ id: z.string().uuid() })

export async function updateMD(formData: FormData): Promise<Result> {
  const raw = {
    id: formData.get('id'),
    team_id: formData.get('team_id'),
    title: formData.get('title'),
    readme: formData.get('readme') || undefined,
    content: formData.get('content'),
    tags: readTags(formData),
  }
  const parsed = UpdateMDSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid markdown payload.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('markdown_files')
    .update({
      title: parsed.data.title,
      readme: parsed.data.readme ?? null,
      content: parsed.data.content,
      tags: parsed.data.tags,
    })
    .eq('id', parsed.data.id)
  if (error) return { error: error.message }

  revalidatePath(`/md/${parsed.data.id}`)
  revalidatePath(`/teams/${parsed.data.team_id}`)
  return { ok: true }
}

const DeleteMDSchema = z.object({ id: z.string().uuid(), team_id: z.string().uuid() })

export async function deleteMD(formData: FormData): Promise<Result> {
  const parsed = DeleteMDSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const { error } = await supabase.from('markdown_files').delete().eq('id', parsed.data.id)
  if (error) return { error: error.message }

  revalidatePath(`/teams/${parsed.data.team_id}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

const RateSchema = z.object({
  md_id: z.string().uuid(),
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
})

export async function rateMD(formData: FormData): Promise<Result> {
  const parsed = RateSchema.safeParse({
    md_id: formData.get('md_id'),
    stars: formData.get('stars'),
    comment: formData.get('comment') || undefined,
  })
  if (!parsed.success) return { error: 'Invalid rating.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('md_feedback').upsert(
    {
      md_id: parsed.data.md_id,
      user_id: user.id,
      stars: parsed.data.stars,
      comment: parsed.data.comment ?? null,
      author_seen: false,
    },
    { onConflict: 'md_id,user_id' }
  )
  if (error) return { error: error.message }

  revalidatePath(`/md/${parsed.data.md_id}`)
  return { ok: true }
}

const DirectShareSchema = z.object({
  md_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  message: z.string().max(2000).optional(),
})

export async function directShare(formData: FormData): Promise<Result> {
  const parsed = DirectShareSchema.safeParse({
    md_id: formData.get('md_id'),
    recipient_id: formData.get('recipient_id'),
    message: formData.get('message') || undefined,
  })
  if (!parsed.success) return { error: 'Invalid share.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('direct_shares').insert({
    md_id: parsed.data.md_id,
    sender_id: user.id,
    recipient_id: parsed.data.recipient_id,
    message: parsed.data.message ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath('/inbox')
  return { ok: true }
}

const CrossTeamSchema = z.object({
  md_id: z.string().uuid(),
  from_team_id: z.string().uuid(),
  to_team_id: z.string().uuid(),
})

export async function requestCrossTeamShare(formData: FormData): Promise<Result> {
  const parsed = CrossTeamSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }
  if (parsed.data.from_team_id === parsed.data.to_team_id) {
    return { error: 'Pick a different team.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('cross_team_requests').insert({
    md_id: parsed.data.md_id,
    from_team_id: parsed.data.from_team_id,
    to_team_id: parsed.data.to_team_id,
    requested_by: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/inbox')
  return { ok: true }
}

const ResolveCrossTeamSchema = z.object({
  id: z.string().uuid(),
  approve: z.enum(['1', '0']),
})

export async function resolveCrossTeamRequest(formData: FormData): Promise<Result> {
  const parsed = ResolveCrossTeamSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const approve = parsed.data.approve === '1'

  const { data: req, error: fetchError } = await supabase
    .from('cross_team_requests')
    .select('id, md_id, to_team_id, status')
    .eq('id', parsed.data.id)
    .single()
  if (fetchError || !req) return { error: fetchError?.message ?? 'Not found.' }
  if (req.status !== 'pending') return { error: 'Already resolved.' }

  const { error: updateError } = await supabase
    .from('cross_team_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
  if (updateError) return { error: updateError.message }

  if (approve) {
    const { error: visError } = await supabase
      .from('md_team_visibility')
      .insert({ md_id: req.md_id, team_id: req.to_team_id })
    if (visError) return { error: visError.message }
  }

  revalidatePath('/inbox')
  revalidatePath(`/md/${req.md_id}`)
  revalidatePath(`/teams/${req.to_team_id}`)
  return { ok: true }
}

const MarkSeenSchema = z.object({ id: z.string().uuid() })

export async function markDirectShareSeen(formData: FormData): Promise<Result> {
  const parsed = MarkSeenSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('direct_shares')
    .update({ seen: true })
    .eq('id', parsed.data.id)
  if (error) return { error: error.message }

  revalidatePath('/inbox')
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function markFeedbackSeen(formData: FormData): Promise<Result> {
  const parsed = MarkSeenSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('md_feedback')
    .update({ author_seen: true })
    .eq('id', parsed.data.id)
  if (error) return { error: error.message }

  revalidatePath('/inbox')
  revalidatePath('/', 'layout')
  return { ok: true }
}
