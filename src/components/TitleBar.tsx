/**
 * 타이틀바 영역을 대체하는 빈 드래그/클리어런스 스트립.
 *
 * 예전의 상단바(제목·테마·설정)는 제거했다 — 제목은 네이티브 윈도우 타이틀로,
 * 테마·설정은 사이드바 푸터로 옮겼다. macOS Overlay 타이틀바(tauri.conf.json)는
 * 트래픽 라이트를 웹뷰 위에 띄우므로, 그 라이트가 콘텐츠를 가리지 않도록 ~28px
 * 높이만 비워 둔다. data-tauri-drag-region 으로 이 영역을 드래그하면 창이 움직인다.
 */
export function TitleBar() {
  return <div className="h-7 shrink-0" data-tauri-drag-region aria-hidden="true" />
}
