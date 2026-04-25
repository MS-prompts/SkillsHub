'use client'

import { useTransition, useState } from 'react'
import { Crown } from 'lucide-react'
import { changeTeamLead } from '@/app/teams/actions'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Member {
  id: string
  display_name: string
}

export function ChangeLeadForm({
  teamId,
  currentLeadId,
  members,
}: {
  teamId: string
  currentLeadId: string
  members: Member[]
}) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState(currentLeadId)
  const [error, setError] = useState('')

  function submit() {
    if (!selected || selected === currentLeadId) return
    setError('')
    startTransition(async () => {
      const fd = new FormData()
      fd.set('team_id', teamId)
      fd.set('new_lead_id', selected)
      const result = await changeTeamLead(fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select new lead…" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.display_name}
                {m.id === currentLeadId ? ' (current lead)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={submit}
          disabled={pending || selected === currentLeadId}
          variant="outline"
        >
          <Crown className="mr-2 h-4 w-4" />
          Set lead
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
