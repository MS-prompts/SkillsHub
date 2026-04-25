'use client'

import { useTransition } from 'react'
import { setUserRole } from './actions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ROLES = ['member', 'lead', 'admin'] as const

export function UserRoleSelect({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string
  currentRole: string
  isSelf: boolean
}) {
  const [pending, startTransition] = useTransition()

  function onChange(role: string) {
    if (role === currentRole) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('user_id', userId)
      fd.set('role', role)
      await setUserRole({}, fd)
    })
  }

  return (
    <Select
      defaultValue={currentRole}
      onValueChange={onChange}
      disabled={pending || isSelf}
    >
      <SelectTrigger className="h-8 w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
