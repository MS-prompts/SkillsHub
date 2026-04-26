'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { markFeedbackSeen } from '@/app/md/actions'

export function MarkFeedbackSeenButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await markFeedbackSeen(fd)
    })
  }

  return (
    <Button size="sm" variant="ghost" onClick={submit} disabled={pending}>
      Mark seen
    </Button>
  )
}
