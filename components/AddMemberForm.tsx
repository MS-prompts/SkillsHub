'use client'

import { useTransition, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { addMember } from '@/app/teams/actions'
import { Button } from '@/components/ui/button'
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

export function AddMemberForm({ teamId, candidates }: { teamId: string; candidates: User[] }) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')

  function submit() {
    if (!selected) return
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('team_id', teamId)
      fd.set('user_id', selected)
      const result = await addMember(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setSelected('')
      }
    })
  }

  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">All company members are already in this team.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a user to add…" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.display_name} ({u.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={submit} disabled={pending || !selected}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
