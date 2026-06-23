import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { cached } from '@/lib/cache'
import { useColorScheme } from '@/lib/theme'

type Scheme = 'light' | 'dark'

// SVG 출력은 (테마, 차트)의 순수 함수라 변하지 않으므로, TTL 은 신선도가 아니라
// 메모리 상한 역할만 한다. 한 세션에서 같은 파일을 다시 열 때 재렌더 없이 즉시
// 보일 만큼 길게 두되, 무한정 쌓이지는 않게 한다.
const SVG_CACHE_TTL_SECONDS = 600

let renderSeq = 0

// mermaid 는 전역 싱글톤이라 initialize 는 테마가 바뀔 때 한 번만 호출하면 된다.
// 인스턴스마다(다이어그램 개수만큼) 호출하던 것을 모듈 스코프로 끌어올려
// 중복 초기화를 없앤다.
let initializedScheme: Scheme | null = null
function ensureInitialized(scheme: Scheme) {
  if (initializedScheme === scheme) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: scheme === 'dark' ? 'dark' : 'default',
  })
  initializedScheme = scheme
}

// 렌더된 SVG 를 (테마, 차트)별로 캐시한다. Promise 를 캐시하므로 같은 파일
// 재방문·테마 토글뿐 아니라 dev StrictMode 의 이중 마운트나 동시 렌더에서도
// dagre 레이아웃(동기·고비용) 재계산을 한 번으로 합친다. 스탬피드 방지·실패
// 제거는 공용 cached() 가 처리하므로 그대로 재사용한다.
function renderChart(scheme: Scheme, chart: string): Promise<string> {
  return cached(`mermaid:${scheme}::${chart}`, SVG_CACHE_TTL_SECONDS, () => {
    ensureInitialized(scheme)
    const id = `mermaid-${renderSeq++}`
    return mermaid.render(id, chart).then(({ svg }) => svg)
  })
}

// 다이어그램 렌더·DOM 주입을 프레임 단위로 직렬화한다. 각 작업은 rAF 뒤에
// 실행되므로 (1) 네비게이션 첫 페인트가 먼저 끝나 전환이 즉시 반응하고,
// (2) 보이는 다이어그램이 여러 개여도 한 번에 하나씩 처리돼 그 사이에 스크롤·
// 입력이 끼어들 수 있다. 캐시(renderChart)는 dagre 레이아웃 재계산을 건너뛰게
// 해주지만, 큰 SVG 를 innerHTML 로 주입하는 브라우저 레이아웃 비용은 캐시 적중
// 시에도 남으므로 그 비용까지 페인트 뒤로 미룬다.
let renderChain: Promise<unknown> = Promise.resolve()

function scheduleRender(scheme: Scheme, chart: string): Promise<string> {
  const result = renderChain.then(
    () =>
      new Promise<string>((resolve, reject) => {
        requestAnimationFrame(() => {
          renderChart(scheme, chart).then(resolve, reject)
        })
      }),
  )
  // 다음 작업이 이 작업의 성패와 무관하게 이어지도록 에러를 삼킨 체인을 유지한다.
  renderChain = result.catch(() => undefined)
  return result
}

/**
 * 소스 텍스트에서 Mermaid 다이어그램을 렌더링한다. 이 모듈과 무거운
 * mermaid 라이브러리는 MarkdownRenderer 의 React.lazy 를 통해 지연 로드되므로,
 * 문서에 실제로 ```mermaid 블록이 있을 때만 로드된다.
 *
 * 추가로, 다이어그램이 화면(또는 근처)에 들어올 때만 렌더한다. dagre 레이아웃은
 * 동기적으로 메인 스레드를 막으므로, 스크롤 아래 안 보이는 것까지 마운트 즉시
 * 모두 렌더하면 다이어그램이 많은 문서로 전환할 때 길게 멈춘다(주범). 보이는
 * 1~2개만 렌더하고 나머지는 스크롤될 때 렌더해 전환 비용을 잘게 나눈다.
 */
export function Mermaid({ chart }: { chart: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<'pending' | 'rendered' | 'error'>('pending')
  const scheme = useColorScheme()

  // 뷰포트 200px 이내로 들어오면 렌더 대상으로 표시한다. 한 번 보이면 관찰을 멈춘다.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 보이게 된 뒤(그리고 테마·차트가 바뀔 때) 캐시를 통해 렌더한다.
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    scheduleRender(scheme, chart)
      .then((svg) => {
        if (cancelled || !svgRef.current) return
        svgRef.current.innerHTML = svg
        setStatus('rendered')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [visible, chart, scheme])

  return (
    <div ref={wrapperRef} className="my-4">
      {status === 'error' ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="mb-1 font-semibold">Mermaid 렌더 실패</p>
          <pre className="overflow-x-auto whitespace-pre-wrap">{chart}</pre>
        </div>
      ) : (
        <>
          {status === 'pending' && (
            <div className="flex min-h-[180px] items-center justify-center rounded-md border border-line text-xs text-muted">
              다이어그램 렌더링 중…
            </div>
          )}
          <div
            ref={svgRef}
            className={
              status === 'rendered'
                ? 'flex justify-center [&_svg]:h-auto [&_svg]:max-w-full'
                : 'hidden'
            }
          />
        </>
      )}
    </div>
  )
}
