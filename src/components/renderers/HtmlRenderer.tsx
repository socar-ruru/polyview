'use client'

import { useColorScheme } from '@/lib/use-color-scheme'

/**
 * Renders an uploaded HTML file inside a sandboxed iframe. The sandbox grants
 * only `allow-scripts` — crucially NOT `allow-same-origin` — so the document
 * runs in an opaque origin and cannot read cookies, storage, or the parent DOM.
 *
 * `color-scheme` on the iframe propagates the app's light/dark to the embedded
 * document's default chrome (background, scrollbars, form controls). The user's
 * own HTML styling still wins for explicitly-coloured elements.
 */
export function HtmlRenderer({ content }: { content: string }) {
  const colorScheme = useColorScheme()
  return (
    <iframe
      title="HTML preview"
      sandbox="allow-scripts"
      className="h-full w-full border-0"
      style={{ colorScheme }}
      srcDoc={content}
    />
  )
}
