'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, LayoutGrid, Shield, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TopBarNavProps = {
  inboxCount: number
  isAdmin: boolean
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navButtonClass(active: boolean): string {
  return cn(
    'rounded-md',
    active && 'bg-muted text-foreground hover:bg-muted/90'
  )
}

export function TopBarNav({ inboxCount, isAdmin }: TopBarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-1 md:flex">
      <Button asChild variant="ghost" size="sm" className={navButtonClass(isActive(pathname, '/dashboard'))}>
        <Link href="/dashboard">
          <LayoutGrid className="mr-2 h-4 w-4" />
          Dashboard
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className={navButtonClass(isActive(pathname, '/teams'))}>
        <Link href="/teams">
          <Users className="mr-2 h-4 w-4" />
          Teams
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className={navButtonClass(isActive(pathname, '/inbox'))}>
        <Link href="/inbox" className="relative">
          <Inbox className="mr-2 h-4 w-4" />
          Inbox
          {inboxCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 px-1.5">
              {inboxCount}
            </Badge>
          )}
        </Link>
      </Button>
      {isAdmin && (
        <Button asChild variant="ghost" size="sm" className={navButtonClass(isActive(pathname, '/admin'))}>
          <Link href="/admin">
            <Shield className="mr-2 h-4 w-4" />
            Admin
          </Link>
        </Button>
      )}
    </nav>
  )
}
