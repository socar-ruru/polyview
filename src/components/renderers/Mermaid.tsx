'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Configure once when this lazily-loaded chunk is first imported.
mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' })

let renderSeq = 0

/**
 * Renders a Mermaid diagram from its source text. This module — and the heavy
 * mermaid library it imports — is loaded lazily via next/dynamic from
 * MarkdownRenderer, so it ships only when a document actually contains a
 * ```mermaid block.
 */
export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const id = `mermaid-${renderSeq++}`
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return
        ref.current.innerHTML = svg
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [chart])

  return (
    <>
      {error && (
        <div className="my-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="mb-1 font-semibold">Mermaid 렌더 실패</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">{chart}</pre>
        </div>
      )}
      <div
        ref={ref}
        className={error ? 'hidden' : 'my-4 flex justify-center [&_svg]:h-auto [&_svg]:max-w-full'}
      />
    </>
  )
}
