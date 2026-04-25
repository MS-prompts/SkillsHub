'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removeMember } from '@/app/teams/actions'

export function RemoveMemberButton({ teamId, userId }: { teamId: string; userId: string }) {
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!confirm('Remove this member from the team?')) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('team_id', teamId)
      fd.set('user_id', userId)
      await removeMember(fd)
    })
  }

  return (
    <Button variant="ghost" size="sm" onClick={submit} disabled={pending}>
      <Trash2 className="mr-2 h-4 w-4 text-destructive" />
      Remove
    </Button>
  )
}
