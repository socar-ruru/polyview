'use client'

import dynamic from 'next/dynamic'
import '@scalar/api-reference-react/style.css'

// Scalar is a large, browser-only bundle: load it lazily and only when the
// OpenAPI tab is actually selected.
const ApiReferenceReact = dynamic(
  () => import('@scalar/api-reference-react').then((m) => m.ApiReferenceReact),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        Loading API reference…
      </div>
    ),
  },
)

/**
 * Renders a yaml/json OpenAPI document with Scalar. `hideTestRequestButton`
 * removes the interactive request client so the viewer never fires calls at
 * internal API servers from the user's browser.
 */
export function OpenApiRenderer({ content }: { content: string }) {
  return (
    <div className="h-full overflow-auto">
      <ApiReferenceReact
        configuration={{
          content,
          hideTestRequestButton: true,
        }}
      />
    </div>
  )
}
