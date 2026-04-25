import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'

const ALERT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n?/i

const LABELS: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

const remarkGithubAlerts: Plugin = () => {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any) => {
      const firstChild = node.children?.[0]
      if (firstChild?.type !== 'paragraph') return

      const firstText = firstChild.children?.[0]
      if (firstText?.type !== 'text') return

      const match = firstText.value.match(ALERT_RE)
      if (!match) return

      const alertType = match[1].toLowerCase()

      // Strip the [!TYPE] prefix from text
      firstText.value = firstText.value.slice(match[0].length)
      // Drop empty leading paragraph
      if (!firstText.value.trim() && firstChild.children.length === 1) {
        node.children.shift()
      }

      // Prepend the title paragraph
      node.children.unshift({
        type: 'paragraph',
        data: { hProperties: { className: `github-alert-title github-alert-title-${alertType}` } },
        children: [{ type: 'text', value: LABELS[alertType] ?? alertType }],
      })

      // Rewrite blockquote → div
      node.data = {
        ...node.data,
        hName: 'div',
        hProperties: { className: `github-alert github-alert-${alertType}` },
      }
    })
  }
}

export default remarkGithubAlerts
