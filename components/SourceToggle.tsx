'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MDViewer } from './MDViewer'
import { Code, Eye } from 'lucide-react'

export function SourceToggle({ content, title }: { content: string; title?: string }) {
  const [showSource, setShowSource] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyRaw() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title ?? 'document'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title={copied ? 'Copied!' : 'Copy raw content'}
          onClick={copyRaw}
        >
          {copied ? (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
            </svg>
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Download raw file"
          onClick={download}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
            <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06z" />
          </svg>
        </Button>

        <div className="mx-1 h-4 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={() => setShowSource((s) => !s)}>
          {showSource ? (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Rendered
            </>
          ) : (
            <>
              <Code className="mr-2 h-4 w-4" />
              Source
            </>
          )}
        </Button>
      </div>
      {showSource ? (
        <pre className="w-full whitespace-pre-wrap break-all rounded-lg border bg-muted p-4 font-mono text-sm">
          <code>{content}</code>
        </pre>
      ) : (
        <MDViewer content={content} />
      )}
    </div>
  )
}
