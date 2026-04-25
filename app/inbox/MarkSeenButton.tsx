'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { markDirectShareSeen } from '@/app/md/actions'

export function MarkSeenButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await markDirectShareSeen(fd)
    })
  }

  return (
    <Button size="sm" variant="ghost" onClick={submit} disabled={pending}>
      Mark seen
    </Button>
  )
}
