import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useColorScheme } from '@/lib/theme'

let renderSeq = 0

/**
 * 소스 텍스트에서 Mermaid 다이어그램을 렌더링한다. 이 모듈과 무거운
 * mermaid 라이브러리는 MarkdownRenderer 의 React.lazy 를 통해 지연 로드되므로,
 * 문서에 실제로 ```mermaid 블록이 있을 때만 로드된다.
 */
export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const scheme = useColorScheme()

  // 테마가 바뀔 때만 mermaid 를 재설정한다. 차트가 바뀔 때마다 하지 않는다.
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: scheme === 'dark' ? 'dark' : 'default',
    })
  }, [scheme])

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
  }, [chart, scheme])

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
