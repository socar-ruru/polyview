/**
 * 미리 하이라이팅된(Shiki) 소스를 macOS 스타일 "창" 프레임 안에 렌더한다 —
 * 신호등 버튼, 파일명, 다크 테마, 둥근 모서리, 그림자(carbon.now.sh 에서 착안).
 * HTML 은 Shiki 가 코드를 이스케이프해 스타일 span 으로 만든 것이라 그대로 주입해도 안전하다.
 */
export function CodeRenderer({ html, filename }: { html: string; filename: string }) {
  return (
    <div className="h-full overflow-hidden bg-subtle p-4">
      <div className="flex h-full flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-line">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-inset px-4">
          {/* macOS 신호등 색상 — 장식용 크롬이라 라이트/다크 모두 고정 */}
          <span className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </span>
          <span className="ml-2 truncate font-mono text-xs text-muted">{filename}</span>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto bg-canvas text-[13px] leading-relaxed [&_code]:font-mono [&_pre]:m-0 [&_pre]:!bg-transparent [&_pre]:p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
