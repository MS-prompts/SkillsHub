'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function ThemeToggleItem() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <DropdownMenuItem
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="cursor-pointer"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="mr-2 h-4 w-4" />
      ) : (
        <Moon className="mr-2 h-4 w-4" />
      )}
      {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
    </DropdownMenuItem>
  )
}
