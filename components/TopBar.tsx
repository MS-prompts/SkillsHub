import Link from 'next/link'
import { LogOut, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TopBarNav } from '@/components/TopBarNav'
import { ThemeToggleItem } from '@/components/ThemeToggleItem'

async function getInboxCount(): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase.rpc('inbox_unread_count')
  return (data as number) ?? 0
}

export async function TopBar() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let displayName = ''
  let inboxCount = 0
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, role')
      .eq('id', user.id)
      .single()
    displayName = profile?.display_name ?? user.email ?? ''
    isAdmin = profile?.role === 'admin'
    inboxCount = await getInboxCount()
  }

  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            SkillsHub
          </Link>
          {user && <TopBarNav inboxCount={inboxCount} isAdmin={isAdmin} />}
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{displayName}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/u/${user.id}`}>My profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ThemeToggleItem />
              <DropdownMenuSeparator />
              <form action={signOut}>
                <button type="submit" className="w-full">
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
