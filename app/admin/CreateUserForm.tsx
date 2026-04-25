'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createUser } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Creating…' : 'Create user'}
    </Button>
  )
}

export function CreateUserForm() {
  const [state, action] = useFormState(createUser, {})

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cu-name">Display name</Label>
        <Input id="cu-name" name="display_name" required maxLength={80} placeholder="Jane Smith" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cu-email">Email</Label>
        <Input id="cu-email" name="email" type="email" required autoComplete="off" placeholder="jane@yourcompany.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cu-password">Temporary password</Label>
        <Input
          id="cu-password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="min 6 characters"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cu-role">Role</Label>
        <Select name="role" defaultValue="member">
          <SelectTrigger id="cu-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">member</SelectItem>
            <SelectItem value="lead">lead</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}
