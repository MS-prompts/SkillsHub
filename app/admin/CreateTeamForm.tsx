'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createTeam } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface User {
  id: string
  display_name: string
  role: string
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Creating…' : 'Create team'}
    </Button>
  )
}

export function CreateTeamForm({ users }: { users: User[] }) {
  const [state, action] = useFormState(createTeam, {})

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Team name</Label>
        <Input id="name" name="name" required maxLength={100} placeholder="e.g. Engineering" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" maxLength={500} rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lead_id">Team lead</Label>
        <Select name="lead_id" required>
          <SelectTrigger id="lead_id">
            <SelectValue placeholder="Select a lead…" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.display_name} ({u.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}
