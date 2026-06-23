// React / ReactDOM UMD 프로덕션 빌드를 문자열로 가져와 TSX 샌드박스 iframe 에 주입한다.
// 실제 파일은 vite.config.ts 의 `virtual:react-umd` 플러그인이 읽어 제공한다.
// React 18 의 UMD(window.React / window.ReactDOM 전역) 덕분에 CDN 없이 완전
// 오프라인으로 TSX 미리보기를 실행할 수 있다.
export { reactUmd, reactDomUmd } from 'virtual:react-umd'
