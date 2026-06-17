'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useColorScheme } from '@/lib/use-color-scheme'
import '@scalar/api-reference-react/style.css'

// Scalar is a large, browser-only bundle: load it lazily and only when the
// OpenAPI tab is actually selected.
const ApiReferenceReact = dynamic(
  () => import('@scalar/api-reference-react').then((m) => m.ApiReferenceReact),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted">
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
  const scheme = useColorScheme()
  // Memoized so Scalar (heavy) only re-renders when content or theme changes.
  const configuration = useMemo(
    () => ({ content, hideTestRequestButton: true, darkMode: scheme === 'dark' }),
    [content, scheme],
  )
  return (
    <div className="h-full overflow-auto">
      <ApiReferenceReact configuration={configuration} />
    </div>
  )
}
