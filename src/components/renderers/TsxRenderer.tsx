'use client'

import { useEffect, useState } from 'react'
import { useColorScheme } from '@/lib/use-color-scheme'

type State =
  | { status: 'loading' }
  | { status: 'ready'; srcDoc: string }
  | { status: 'error'; message: string }

/**
 * Renders a standalone .tsx file by sending its source to the server, where
 * esbuild bundles it (with React) into a single script, then mounting that
 * script inside a sandboxed iframe. The compile never leaves the container.
 */
export function TsxRenderer({ code }: { code: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const colorScheme = useColorScheme()

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    fetch('/api/compile-tsx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setState({ status: 'error', message: data.error ?? `Compile failed (${res.status})` })
          return
        }
        setState({ status: 'ready', srcDoc: buildSrcDoc(data.js as string) })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: String(err) })
      })

    return () => {
      cancelled = true
    }
  }, [code])

  if (state.status === 'loading') {
    return <Centered>Compiling…</Centered>
  }
  if (state.status === 'error') {
    return (
      <div className="h-full overflow-auto bg-canvas p-6">
        <h2 className="mb-2 text-sm font-semibold text-error">Compilation failed</h2>
        <pre className="overflow-x-auto rounded-lg border border-line bg-subtle p-4 text-xs text-fg">
          {state.message}
        </pre>
      </div>
    )
  }
  return (
    <iframe
      title="tsx preview"
      sandbox="allow-scripts"
      className="h-full w-full border-0"
      style={{ colorScheme }}
      srcDoc={state.srcDoc}
    />
  )
}

function buildSrcDoc(js: string): string {
  // Prevent an embedded "</script>" in the bundle from closing the tag early.
  const safe = js.replace(/<\/(script)/gi, '<\\/$1')
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><style>html,body{margin:0;height:100%}</style></head>
  <body>
    <div id="root"></div>
    <script>${safe}</script>
  </body>
</html>`
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      {children}
    </div>
  )
}
