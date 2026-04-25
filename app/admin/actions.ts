'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Result = { error?: string }

async function assertAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') throw new Error('Admin access required.')
  return { user, profile }
}

const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  lead_id: z.string().uuid(),
})

export async function createTeam(_prev: Result, formData: FormData): Promise<Result> {
  try {
    const { profile } = await assertAdmin()
    const parsed = CreateTeamSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { error: 'Invalid input.' }

    const admin = createAdminClient()

    const { data: team, error: teamError } = await admin
      .from('teams')
      .insert({
        company_id: profile.company_id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        lead_id: parsed.data.lead_id,
      })
      .select('id')
      .single()
    if (teamError) return { error: teamError.message }

    const { error: memberError } = await admin
      .from('team_members')
      .insert({ team_id: team.id, user_id: parsed.data.lead_id })
    if (memberError) return { error: memberError.message }

    revalidatePath('/admin')
    revalidatePath('/teams')
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unknown error.' }
  }
}

const SetRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['member', 'lead', 'admin']),
})

export async function setUserRole(_prev: Result, formData: FormData): Promise<Result> {
  try {
    await assertAdmin()
    const parsed = SetRoleSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { error: 'Invalid input.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({ role: parsed.data.role })
      .eq('id', parsed.data.user_id)
    if (error) return { error: error.message }

    revalidatePath('/admin')
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unknown error.' }
  }
}

const CreateUserSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1).max(80),
  password: z.string().min(6),
  role: z.enum(['member', 'lead', 'admin']),
})

export async function createUser(_prev: Result, formData: FormData): Promise<Result> {
  try {
    await assertAdmin()
    const parsed = CreateUserSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { error: 'Invalid input. Password must be 6+ chars.' }

    const { email, display_name, password, role } = parsed.data
    const admin = createAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    })
    if (authError) return { error: authError.message }

    // Trigger handle_new_user() fires synchronously — update role if not default member
    if (role !== 'member' && authData.user) {
      const { error: roleError } = await admin
        .from('profiles')
        .update({ role })
        .eq('id', authData.user.id)
      if (roleError) return { error: roleError.message }
    }

    revalidatePath('/admin')
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unknown error.' }
  }
}
