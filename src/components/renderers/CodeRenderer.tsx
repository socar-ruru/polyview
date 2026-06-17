/**
 * Renders pre-highlighted (server-side Shiki) source inside a macOS-style
 * "window" frame — traffic-light buttons, filename, dark theme, rounded corners
 * and a shadow — inspired by carbon.now.sh. The HTML comes from Shiki, which
 * escapes the code into styled spans, so it is safe to inject.
 */
export function CodeRenderer({ html, filename }: { html: string; filename: string }) {
  return (
    <div className="h-full overflow-hidden bg-neutral-100 p-4">
      <div className="flex h-full flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/10">
        <div className="flex h-9 shrink-0 items-center gap-2 bg-[#161b22] px-4">
          <span className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </span>
          <span className="ml-2 truncate font-mono text-xs text-neutral-400">{filename}</span>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto bg-[#0d1117] text-[13px] leading-relaxed [&_code]:font-mono [&_pre]:m-0 [&_pre]:!bg-transparent [&_pre]:p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
