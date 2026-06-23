import { lazy, memo, Suspense, useEffect, useMemo, useRef } from 'react'
import { useColorScheme } from '@/lib/theme'
import '@scalar/api-reference-react/style.css'

// Scalar 는 크기가 큰 브라우저 전용 번들이므로, OpenAPI 탭이 실제로 선택될 때만
// 지연 로드한다.
const ApiReferenceReact = lazy(() =>
  import('@scalar/api-reference-react').then((m) => ({ default: m.ApiReferenceReact })),
)

// 사이드바 클릭 시 해당 섹션으로 스크롤한다.
// Scalar 는 pathRouting 이 꺼져 있으면 사이드바를 `<a href="#id">` 로만 두고
// 브라우저의 네이티브 #fragment 스크롤에 의존한다. 그런데 우리는 Scalar 를
// 고정 높이 패널에 임베드하고 콘텐츠 스크롤을 .references-rendered 셀에
// 가뒀으므로(index.css 참고) window 자체는 스크롤되지 않는다. WebKit 의
// 네이티브 fragment 스크롤이 이 중첩 스크롤 컨테이너까지 닿지 못해 콘텐츠가
// 움직이지 않는다. Scalar 가 pathRouting 모드에서 쓰는 scrollToId 와 동일하게
// getElementById + scrollIntoView 로 직접 스크롤한다(scrollIntoView 는 가장
// 가까운 스크롤 조상 = .references-rendered 를 스크롤한다). 뷰포트 지연 렌더로
// 아직 DOM 에 없을 수 있어 1초간 rAF 로 재시도한다.
function scrollToSection(id: string) {
  const stopAt = Date.now() + 1000
  const tryScroll = () => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView()
      return
    }
    if (Date.now() < stopAt) requestAnimationFrame(tryScroll)
  }
  tryScroll()
}

/**
 * yaml/json OpenAPI 문서를 Scalar 로 렌더링한다. `hideTestRequestButton` 은
 * 인터랙티브 요청 클라이언트를 제거하여, 뷰어가 사용자 머신에서 내부 API 서버로
 * 요청을 보내지 않도록 한다.
 */
export const OpenApiRenderer = memo(function OpenApiRenderer({ content }: { content: string }) {
  const scheme = useColorScheme()

  // Scalar 는 자기 테마를 document.body 의 .dark-mode/.light-mode 클래스로 칠한다
  // (@scalar/use-hooks 의 useColorMode). 이 클래스를 우리가 직접 토글해 테마를
  // 라이브로 뒤집는다 — 이렇게 하면 CSS 변수만 바뀌어 리마운트가 필요 없다.
  //
  // 과거에는 테마가 바뀔 때 <ApiReferenceReact key={scheme}> 로 강제 리마운트했다.
  // 그러나 리마운트는 두 개의 중첩된 Vue 앱 + body 로 teleport 된 오버레이
  // (#headlessui-portal-root 의 모달/드롭다운) + MutationObserver 를 통째로
  // 헐고 다시 짓는데, Scalar 의 destroy() 는 app.unmount() 만 하고 그 teleport
  // 노드/옵저버/body 클래스를 정리하지 않는다. 그래서 unmount 시점에 열려 있던
  // 오버레이가 옛 테마 그대로 body 에 고아로 남아 새 콘텐츠 위에 떠 있었다
  // (테마/파일을 "선택"하면 이전 상태가 남던 버그). 리마운트를 없애 원천 차단한다.
  //
  // 초기 마운트 시점에는 Scalar 의 useColorMode 가 localStorage 의 저장값이나
  // 시스템 설정으로 body 클래스를 칠해버릴 수 있으므로, forceDarkModeState 로
  // 첫 색상 모드를 앱 테마에 고정한다. hideDarkModeToggle 로 Scalar 자체 토글을
  // 숨겨, 그 버튼이 내부 colorMode 를 바꿔 우리 클래스와 충돌하지 않게 한다.
  useEffect(() => {
    const { classList } = document.body
    classList.toggle('dark-mode', scheme === 'dark')
    classList.toggle('light-mode', scheme !== 'dark')
    return () => classList.remove('dark-mode', 'light-mode')
  }, [scheme])

  // configuration 은 content 에만 의존한다. 테마 전환은 위 body 클래스(CSS)가
  // 처리하므로 Scalar config 로 흘릴 필요가 없다. forceDarkModeState 는 첫
  // 마운트의 색상 모드만 정하고 이후 변경은 Scalar 가 반영하지 않으므로 마운트
  // 시점 값으로 고정한다 — 그래야 config 객체가 테마 토글에 안정적이어서
  // 토글마다 불필요한 updateConfiguration(전체 재diff) 호출이 일어나지 않는다.
  const initialScheme = useRef(scheme).current
  const configuration = useMemo(
    () => ({
      content,
      hideTestRequestButton: true,
      hideDarkModeToggle: true,
      forceDarkModeState: initialScheme,
      onSidebarClick: scrollToSection,
    }),
    [content, initialScheme],
  )
  return (
    <div className="openapi-host relative h-full overflow-hidden">
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
})
