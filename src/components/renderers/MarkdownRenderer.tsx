import { isValidElement, lazy, memo, Suspense, useMemo, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// 마크다운 코드 블록은 rehype 를 통해 highlight.js 로 강조한다(react-markdown 파이프라인에
// 동기적으로 연결됨). 독립 소스 파일은 Shiki(lib/highlight.ts)를 사용하는데,
// 비동기 API 라 이 파이프라인에는 맞지 않는다.
// hljs 토큰 색상은 index.css(.hljs-*)에 있으며 .dark 클래스에서 뒤집힌다.
// `mermaid` 블록은 아래에서 가로채 다이어그램으로 렌더링되며, mermaid 라이브러리는
// 지연 로드되어 일반 마크다운 뷰에서는 불필요한 비용이 없다.

const Mermaid = lazy(() =>
  import('@/components/renderers/Mermaid').then((m) => ({ default: m.Mermaid })),
)

const components: Components = {
  pre(props) {
    // `node` 는 hast 노드이며 DOM 속성이 아니므로 spread 에서 제외한다.
    const { node, children, ...rest } = props
    const code = mermaidSource(children)
    if (code !== null) {
      return (
        <Suspense fallback={<div className="my-4 text-xs text-muted">다이어그램 로딩 중…</div>}>
          <Mermaid chart={code} />
        </Suspense>
      )
    }
    return <pre {...rest}>{children}</pre>
  },
}

/** ```mermaid 블록의 소스를 반환하고, 다른 <pre> 에서는 null 을 반환한다. */
function mermaidSource(children: ReactNode): string | null {
  if (!isValidElement(children)) return null
  const props = children.props as { className?: string; children?: ReactNode }
  if (!/\blanguage-mermaid\b/.test(props.className ?? '')) return null
  return String(props.children ?? '').replace(/\n$/, '')
}

/**
 * GitHub 풍 확장, 코드 강조, mermaid 를 포함해 마크다운을 렌더링한다.
 *
 * react-markdown 파싱(remark-gfm + rehype-highlight)은 동기·비용이 커서 content 가
 * 바뀔 때만 다시 만든다. Viewer 가 더 이상 파일마다 remount 하지 않으므로, 이
 * memo + useMemo 조합이 테마 토글·부모 리렌더에서의 불필요한 재파싱을 막는다.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  const tree = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    ),
    [content],
  )
  return <div className="markdown-body w-full">{tree}</div>
})
