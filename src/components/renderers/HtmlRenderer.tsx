import { useMemo } from 'react'
import { getAppFontStack, useColorScheme } from '@/lib/theme'

/**
 * 업로드된 HTML 파일을 sandbox iframe 안에서 렌더링한다. sandbox 는 `allow-scripts`만
 * 허용하고 — `allow-same-origin` 은 의도적으로 제외 — 문서가 불투명 오리진에서 실행되어
 * 쿠키, 스토리지, 부모 DOM 을 읽을 수 없도록 한다.
 *
 * iframe 의 `color-scheme` 은 앱의 라이트/다크 설정을 내장 문서의 기본 크롬
 * (배경, 스크롤바, 폼 컨트롤)에 전달한다. 명시적으로 색상을 지정한 요소는
 * 사용자 HTML 스타일링이 우선한다.
 */
export function HtmlRenderer({ content }: { content: string }) {
  const colorScheme = useColorScheme()
  const fontStack = getAppFontStack()
  const srcDoc = useMemo(() => withDefaultFont(content, fontStack), [content, fontStack])
  return (
    <iframe
      title="HTML preview"
      sandbox="allow-scripts"
      className="h-full w-full border-0"
      style={{ colorScheme }}
      srcDoc={srcDoc}
    />
  )
}

/**
 * 내장 HTML 이 자체 글꼴을 지정하지 않았을 때를 위한 기본 글꼴(시스템 폰트)을
 * 주입한다. `:where(html)` 는 specificity 0 이라 사용자 HTML 의 어떤 글꼴 규칙도
 * 그대로 우선한다. quirks 모드를 건드리지 않도록 doctype 앞이 아니라 head/html
 * 안쪽에 넣는다.
 */
function withDefaultFont(html: string, fontStack: string): string {
  const style = `<style>:where(html){font-family:${fontStack};}</style>`
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + style)
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + style)
  return style + html
}
