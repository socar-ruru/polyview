'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

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
