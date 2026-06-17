'use client'

/**
 * Renders an uploaded HTML file inside a sandboxed iframe. The sandbox grants
 * only `allow-scripts` — crucially NOT `allow-same-origin` — so the document
 * runs in an opaque origin and cannot read cookies, storage, or the parent DOM.
 */
export function HtmlRenderer({ content }: { content: string }) {
  return (
    <iframe
      title="HTML preview"
      sandbox="allow-scripts"
      className="h-full w-full border-0 bg-white"
      srcDoc={content}
    />
  )
}
