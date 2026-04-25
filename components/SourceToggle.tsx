'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MDViewer } from './MDViewer'
import { Code, Eye } from 'lucide-react'

export function SourceToggle({ content }: { content: string }) {
  const [showSource, setShowSource] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
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
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-sm">
          <code>{content}</code>
        </pre>
      ) : (
        <MDViewer content={content} />
      )}
    </div>
  )
}
