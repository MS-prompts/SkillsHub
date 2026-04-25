'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Result = { ok?: boolean; error?: string }

const CreateJoinRequestSchema = z.object({
  team_id: z.string().uuid(),
  message: z.string().max(500).optional(),
})

export async function createJoinRequest(formData: FormData): Promise<Result> {
  const parsed = CreateJoinRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('join_requests').insert({
    team_id: parsed.data.team_id,
    user_id: user.id,
    message: parsed.data.message || null,
  })
  if (error) return { error: error.message }

  revalidatePath('/teams')
  revalidatePath('/inbox')
  return { ok: true }
}

const ResolveSchema = z.object({
  id: z.string().uuid(),
  approve: z.enum(['1', '0']),
})

export async function resolveJoinRequest(formData: FormData): Promise<Result> {
  const parsed = ResolveSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const approve = parsed.data.approve === '1'

  const { data: req, error: fetchError } = await supabase
    .from('join_requests')
    .select('id, team_id, user_id, status')
    .eq('id', parsed.data.id)
    .single()
  if (fetchError || !req) return { error: fetchError?.message ?? 'Not found.' }
  if (req.status !== 'pending') return { error: 'Already resolved.' }

  const { error: updateError } = await supabase
    .from('join_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
  if (updateError) return { error: updateError.message }

  if (approve) {
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: req.team_id, user_id: req.user_id })
    if (memberError) return { error: memberError.message }
  }

  revalidatePath('/inbox')
  revalidatePath('/teams')
  revalidatePath(`/teams/${req.team_id}`)
  return { ok: true }
}

const RemoveMemberSchema = z.object({
  team_id: z.string().uuid(),
  user_id: z.string().uuid(),
})

export async function removeMember(formData: FormData): Promise<Result> {
  const parsed = RemoveMemberSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', parsed.data.team_id)
    .eq('user_id', parsed.data.user_id)
  if (error) return { error: error.message }

  revalidatePath(`/teams/${parsed.data.team_id}`)
  revalidatePath(`/teams/${parsed.data.team_id}/settings`)
  return { ok: true }
}

const AddMemberSchema = z.object({
  team_id: z.string().uuid(),
  user_id: z.string().uuid(),
})

export async function addMember(formData: FormData): Promise<Result> {
  const parsed = AddMemberSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Only team lead or admin can add members directly
  const { data: team } = await supabase
    .from('teams')
    .select('lead_id')
    .eq('id', parsed.data.team_id)
    .single()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isLead = team?.lead_id === user.id
  const isAdmin = profile?.role === 'admin'
  if (!isLead && !isAdmin) return { error: 'Not authorized.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('team_members')
    .insert({ team_id: parsed.data.team_id, user_id: parsed.data.user_id })
  if (error) return { error: error.message }

  revalidatePath(`/teams/${parsed.data.team_id}`)
  revalidatePath(`/teams/${parsed.data.team_id}/settings`)
  return { ok: true }
}

const ChangeLeadSchema = z.object({
  team_id: z.string().uuid(),
  new_lead_id: z.string().uuid(),
})

export async function changeTeamLead(formData: FormData): Promise<Result> {
  const parsed = ChangeLeadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const admin = createAdminClient()

  // Ensure new lead is a member first
  const { data: existing } = await admin
    .from('team_members')
    .select('id')
    .eq('team_id', parsed.data.team_id)
    .eq('user_id', parsed.data.new_lead_id)
    .maybeSingle()
  if (!existing) {
    await admin
      .from('team_members')
      .insert({ team_id: parsed.data.team_id, user_id: parsed.data.new_lead_id })
  }

  const { error } = await admin
    .from('teams')
    .update({ lead_id: parsed.data.new_lead_id })
    .eq('id', parsed.data.team_id)
  if (error) return { error: error.message }

  revalidatePath(`/teams/${parsed.data.team_id}`)
  revalidatePath(`/teams/${parsed.data.team_id}/settings`)
  return { ok: true }
}
