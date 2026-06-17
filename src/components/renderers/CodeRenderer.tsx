'use client'

import { useEffect, useRef } from 'react'
import hljs from '@/lib/highlight-client'
import 'highlight.js/styles/github.css'

/** Raw source view with syntax highlighting (auto-detected when no language). */
export function CodeRenderer({ code, language }: { code: string; language?: string }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Reset so re-highlighting a re-used node doesn't throw.
    el.removeAttribute('data-highlighted')
    el.textContent = code
    if (language && hljs.getLanguage(language)) {
      el.className = `hljs language-${language}`
      el.innerHTML = hljs.highlight(code, { language }).value
    } else {
      const result = hljs.highlightAuto(code)
      el.className = 'hljs'
      el.innerHTML = result.value
    }
  }, [code, language])

  return (
    <div className="h-full overflow-auto bg-[#fff]">
      <pre className="m-0 min-h-full p-4 text-[13px] leading-5">
        <code ref={ref} className="font-mono">
          {code}
        </code>
      </pre>
    </div>
  )
}
