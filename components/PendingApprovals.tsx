'use client'

import { useTransition } from 'react'
import { Check, Share2, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { resolveJoinRequest } from '@/app/teams/actions'
import { resolveCrossTeamRequest } from '@/app/md/actions'
import { formatRelativeTime } from '@/lib/utils'

export interface PendingJoin {
  id: string
  team_id: string
  user_id: string
  message: string | null
  created_at: string
  team: { id: string; name: string } | null
  user: { id: string; display_name: string } | null
}

export interface PendingCrossTeam {
  id: string
  md_id: string
  from_team_id: string
  to_team_id: string
  requested_by: string
  created_at: string
  md: { id: string; title: string } | null
  from_team: { id: string; name: string } | null
  to_team: { id: string; name: string } | null
  requester: { id: string; display_name: string } | null
}

function ApprovalRow({
  title,
  subtitle,
  meta,
  onApprove,
  onReject,
  pending,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  onApprove: () => void
  onReject: () => void
  pending: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        {meta && <div className="mt-1 text-xs text-muted-foreground">{meta}</div>}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="outline" onClick={onReject} disabled={pending}>
          <X className="mr-1 h-3.5 w-3.5" /> Reject
        </Button>
        <Button size="sm" onClick={onApprove} disabled={pending}>
          <Check className="mr-1 h-3.5 w-3.5" /> Approve
        </Button>
      </div>
    </div>
  )
}

export function PendingApprovals({
  joinRequests,
  crossTeamRequests,
}: {
  joinRequests: PendingJoin[]
  crossTeamRequests: PendingCrossTeam[]
}) {
  const [pending, startTransition] = useTransition()

  function handleJoin(id: string, approve: boolean) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      fd.set('approve', approve ? '1' : '0')
      await resolveJoinRequest(fd)
    })
  }

  function handleCrossTeam(id: string, approve: boolean) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      fd.set('approve', approve ? '1' : '0')
      await resolveCrossTeamRequest(fd)
    })
  }

  if (joinRequests.length === 0 && crossTeamRequests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No pending approvals.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {crossTeamRequests.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 px-2">
              <Share2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold">Prompt requests</h3>
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold leading-none text-white">
                {crossTeamRequests.length}
              </span>
            </div>
            <div className="divide-y">
              {crossTeamRequests.map((r) => (
                <div key={r.id} className="px-2">
                  <ApprovalRow
                    title={
                      <>
                        Share{' '}
                        <Link href={`/md/${r.md_id}`} className="underline">
                          {r.md?.title ?? 'this MD'}
                        </Link>{' '}
                        from {r.from_team?.name ?? 'a team'} into {r.to_team?.name ?? 'your team'}
                      </>
                    }
                    subtitle={r.requester ? `Requested by ${r.requester.display_name}` : undefined}
                    meta={formatRelativeTime(r.created_at)}
                    onApprove={() => handleCrossTeam(r.id, true)}
                    onReject={() => handleCrossTeam(r.id, false)}
                    pending={pending}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {joinRequests.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="px-2 text-sm font-semibold">Join requests</h3>
            <div className="divide-y">
              {joinRequests.map((r) => (
                <div key={r.id} className="px-2">
                  <ApprovalRow
                    title={
                      <>
                        {r.user?.display_name ?? 'Someone'} wants to join{' '}
                        {r.team?.name ?? 'your team'}
                      </>
                    }
                    subtitle={r.message ?? undefined}
                    meta={formatRelativeTime(r.created_at)}
                    onApprove={() => handleJoin(r.id, true)}
                    onReject={() => handleJoin(r.id, false)}
                    pending={pending}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
