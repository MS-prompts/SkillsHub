'use client'

import { useState, useTransition } from 'react'
import { Share2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { directShare, requestCrossTeamShare } from '@/app/md/actions'

interface Coworker {
  id: string
  display_name: string
}

interface Team {
  id: string
  name: string
}

interface Props {
  mdId: string
  fromTeamId: string
  coworkers: Coworker[]
  otherTeams: Team[]
}

export function ShareDialog({ mdId, fromTeamId, coworkers, otherTeams }: Props) {
  const [open, setOpen] = useState(false)
  const [recipientId, setRecipientId] = useState('')
  const [toTeamId, setToTeamId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setRecipientId('')
    setToTeamId('')
    setMessage('')
    setError(null)
    setSuccess(null)
  }

  function submitDirect() {
    setError(null)
    setSuccess(null)
    if (!recipientId) {
      setError('Pick a coworker.')
      return
    }
    startTransition(async () => {
      const fd = new FormData()
      fd.set('md_id', mdId)
      fd.set('recipient_id', recipientId)
      fd.set('message', message)
      const res = await directShare(fd)
      if (res?.error) setError(res.error)
      else {
        setSuccess('Sent.')
        reset()
        setTimeout(() => setOpen(false), 800)
      }
    })
  }

  function submitCrossTeam() {
    setError(null)
    setSuccess(null)
    if (!toTeamId) {
      setError('Pick a team.')
      return
    }
    startTransition(async () => {
      const fd = new FormData()
      fd.set('md_id', mdId)
      fd.set('from_team_id', fromTeamId)
      fd.set('to_team_id', toTeamId)
      const res = await requestCrossTeamShare(fd)
      if (res?.error) setError(res.error)
      else {
        setSuccess('Request sent. The target team lead must approve it.')
        reset()
        setTimeout(() => setOpen(false), 1500)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this MD</DialogTitle>
          <DialogDescription>Send to a coworker or create a prompt request.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="direct">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Direct share</TabsTrigger>
            <TabsTrigger value="cross">Prompt request</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-3">
            <div className="space-y-2">
              <Label>Coworker</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick someone" />
                </SelectTrigger>
                <SelectContent>
                  {coworkers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Take a look at this…"
              />
            </div>
            <Button onClick={submitDirect} disabled={pending} className="w-full">
              {pending ? 'Sending…' : 'Send'}
            </Button>
          </TabsContent>

          <TabsContent value="cross" className="space-y-3">
            <div className="space-y-2">
              <Label>Target team</Label>
              <Select value={toTeamId} onValueChange={setToTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a team" />
                </SelectTrigger>
                <SelectContent>
                  {otherTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              The target team&apos;s lead must approve before they can see it.
            </p>
            <Button onClick={submitCrossTeam} disabled={pending} className="w-full">
              {pending ? 'Sending…' : 'Create prompt request'}
            </Button>
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
      </DialogContent>
    </Dialog>
  )
}
