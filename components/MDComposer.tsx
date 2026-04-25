'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { TagSelector } from './TagSelector'
import { MDViewer } from './MDViewer'
import type { MDTag } from '@/lib/types'
import { createMD, updateMD } from '@/app/md/actions'

interface TeamOption {
  id: string
  name: string
}

interface Initial {
  id?: string
  title?: string
  readme?: string
  content?: string
  tags?: MDTag[]
  team_id?: string
}

interface Props {
  teams: TeamOption[]
  initial?: Initial
  mode: 'create' | 'edit'
}

export function MDComposer({ teams, initial, mode }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [readme, setReadme] = useState(initial?.readme ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [tags, setTags] = useState<MDTag[]>(initial?.tags ?? [])
  const [teamId, setTeamId] = useState(initial?.team_id ?? teams[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    if (!title.trim() || !content.trim() || !teamId) {
      setError('Title, content, and team are required.')
      return
    }
    if (tags.length === 0) {
      setError('Pick at least one tag.')
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.set('title', title)
      fd.set('readme', readme)
      fd.set('content', content)
      fd.set('team_id', teamId)
      tags.forEach((t) => fd.append('tags', t))

      if (mode === 'create') {
        const res = await createMD(fd)
        if (res?.error) {
          setError(res.error)
          return
        }
        if (res?.id) router.push(`/md/${res.id}`)
      } else if (initial?.id) {
        fd.set('id', initial.id)
        const res = await updateMD(fd)
        if (res?.error) {
          setError(res.error)
          return
        }
        router.push(`/md/${initial.id}`)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="A short, searchable name"
          />
        </div>
        <div className="space-y-2">
          <Label>Team</Label>
          {teams.length === 1 ? (
            <Input value={teams[0].name} readOnly disabled />
          ) : (
            <Select value={teamId} onValueChange={setTeamId} disabled={mode === 'edit'}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="readme">README</Label>
        <Textarea
          id="readme"
          value={readme}
          onChange={(e) => setReadme(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="One to three lines describing what this MD is for."
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagSelector selected={tags} onChange={setTags} />
      </div>

      <Tabs defaultValue="write" className="w-full">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your markdown here…"
            className="min-h-[400px] w-full font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="preview">
          <Card className="min-h-[400px] p-6">
            {content.trim() ? (
              <MDViewer content={content} />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          <Save className="mr-2 h-4 w-4" />
          {pending ? 'Saving…' : mode === 'create' ? 'Save MD' : 'Update MD'}
        </Button>
      </div>
    </div>
  )
}
