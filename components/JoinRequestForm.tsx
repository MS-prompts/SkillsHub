'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createJoinRequest } from '@/app/teams/actions'

interface Props {
  teamId: string
  alreadyRequested: boolean
  alreadyMember: boolean
}

export function JoinRequestForm({ teamId, alreadyRequested, alreadyMember }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(alreadyRequested)
  const [pending, startTransition] = useTransition()

  if (alreadyMember) {
    return <span className="text-xs text-muted-foreground">Member</span>
  }
  if (done) {
    return <span className="text-xs text-muted-foreground">Request pending</span>
  }
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Request to join
      </Button>
    )
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('team_id', teamId)
      fd.set('message', message)
      const res = await createJoinRequest(fd)
      if (res?.error) setError(res.error)
      else {
        setDone(true)
        setOpen(false)
      }
    })
  }

  return (
    <div className="w-full space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Why do you want to join? (optional)"
        rows={2}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? 'Sending…' : 'Send request'}
        </Button>
      </div>
    </div>
  )
}
