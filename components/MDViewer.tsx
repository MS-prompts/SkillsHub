import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeHighlight from 'rehype-highlight'
import remarkGithubAlerts from '@/lib/remark-github-alerts'
import DOMPurify from 'isomorphic-dompurify'
import { cn } from '@/lib/utils'

export function MDViewer({ content, className }: { content: string; className?: string }) {
  const clean = DOMPurify.sanitize(content)
  return (
    <div className={cn('prose prose-neutral dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFrontmatter, remarkGithubAlerts]}
        rehypePlugins={[rehypeHighlight]}
      >
        {clean}
      </ReactMarkdown>
    </div>
  )
}
