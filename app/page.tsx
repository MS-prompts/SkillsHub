import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpen, Star, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function Home() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="mx-auto max-w-4xl space-y-12 py-12">
      <section className="space-y-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Share what your team knows.</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          SkillsHub is the markdown library for your company. Share AI prompts, skills, rules, and SOPs
          with your team. Rate each other&apos;s work and build a Coworker Grade.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/auth/signup">
              Get started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-2 p-6">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
            <h3 className="font-semibold">GitHub-style markdown</h3>
            <p className="text-sm text-muted-foreground">
              Write, preview, and share rich markdown documents your team can actually read.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-6">
            <Users className="h-6 w-6 text-muted-foreground" />
            <h3 className="font-semibold">Team-scoped feeds</h3>
            <p className="text-sm text-muted-foreground">
              Auto-bind to your company by email domain. Cross-team shares require lead approval.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-6">
            <Star className="h-6 w-6 text-muted-foreground" />
            <h3 className="font-semibold">Coworker Grade</h3>
            <p className="text-sm text-muted-foreground">
              Aggregate ratings into a per-author grade so good work gets surfaced.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
