'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

// Markdown code blocks use highlight.js via rehype (it plugs into the
// react-markdown pipeline synchronously). Standalone source files use Shiki
// (lib/highlight.ts) instead — its async API doesn't fit this pipeline.

/** Renders markdown with GitHub-flavoured extensions and code highlighting. */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-body mx-auto max-w-3xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
