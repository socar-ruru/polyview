import { lazy, Suspense, useMemo } from 'react'
import { useColorScheme } from '@/lib/theme'
import '@scalar/api-reference-react/style.css'

// Scalar 는 크기가 큰 브라우저 전용 번들이므로, OpenAPI 탭이 실제로 선택될 때만
// 지연 로드한다.
const ApiReferenceReact = lazy(() =>
  import('@scalar/api-reference-react').then((m) => ({ default: m.ApiReferenceReact })),
)

/**
 * yaml/json OpenAPI 문서를 Scalar 로 렌더링한다. `hideTestRequestButton` 은
 * 인터랙티브 요청 클라이언트를 제거하여, 뷰어가 사용자 머신에서 내부 API 서버로
 * 요청을 보내지 않도록 한다.
 */
export function OpenApiRenderer({ content }: { content: string }) {
  const scheme = useColorScheme()
  // Scalar(무거움)가 콘텐츠나 테마 변경 시에만 재렌더링되도록 메모이제이션한다.
  const configuration = useMemo(
    () => ({ content, hideTestRequestButton: true, darkMode: scheme === 'dark' }),
    [content, scheme],
  )
  return (
    <div className="h-full overflow-auto">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-muted">
            API 레퍼런스 로딩 중…
          </div>
        }
      >
        <ApiReferenceReact configuration={configuration} />
      </Suspense>
    </div>
  )
}
