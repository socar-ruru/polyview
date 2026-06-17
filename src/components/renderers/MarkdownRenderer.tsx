'use client'

import { isValidElement, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// Markdown code blocks use highlight.js via rehype (it plugs into the
// react-markdown pipeline synchronously). Standalone source files use Shiki
// (lib/highlight.ts) instead — its async API doesn't fit this pipeline.
// hljs token colors live in globals.css (.hljs-*) and flip with .dark.
// `mermaid` blocks are intercepted below and rendered as diagrams; the mermaid
// library is loaded lazily so plain markdown views don't pay for it.

const Mermaid = dynamic(() => import('@/components/renderers/Mermaid').then((m) => m.Mermaid), {
  ssr: false,
})

const components: Components = {
  pre(props) {
    // `node` is the hast node, not a DOM attribute — keep it out of the spread.
    const { node, children, ...rest } = props
    const code = mermaidSource(children)
    if (code !== null) return <Mermaid chart={code} />
    return <pre {...rest}>{children}</pre>
  },
}

/** Returns the source of a ```mermaid block, or null for any other <pre>. */
function mermaidSource(children: ReactNode): string | null {
  if (!isValidElement(children)) return null
  const props = children.props as { className?: string; children?: ReactNode }
  if (!/\blanguage-mermaid\b/.test(props.className ?? '')) return null
  return String(props.children ?? '').replace(/\n$/, '')
}

/** Renders markdown with GitHub-flavoured extensions, code highlighting, and mermaid. */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-body w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
