'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Inbox, LayoutGrid, Shield, Users } from 'lucide-react'
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
          <span className="relative mr-2 inline-flex">
            <Inbox className="h-4 w-4" />
            {inboxCount > 0 && !isActive(pathname, '/inbox') && (
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-foreground" />
            )}
          </span>
          Inbox
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
