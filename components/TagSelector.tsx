'use client'

import { cn } from '@/lib/utils'
import { MD_TAGS, type MDTag } from '@/lib/types'

interface Props {
  selected: MDTag[]
  onChange: (next: MDTag[]) => void
}

export function TagSelector({ selected, onChange }: Props) {
  function toggle(tag: MDTag) {
    if (selected.includes(tag)) onChange(selected.filter((t) => t !== tag))
    else onChange([...selected, tag])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {MD_TAGS.map((tag) => {
        const active = selected.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background hover:bg-accent'
            )}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
