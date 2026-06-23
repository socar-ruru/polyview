import { transform } from 'sucrase'

/**
 * 단일 .tsx 파일을 브라우저에서 바로 실행 가능한 CommonJS 로 변환한다.
 *
 * esbuild 처럼 번들링(모듈 해석)을 하지 않고 Sucrase 로 **변환만** 한다.
 * - TypeScript 제거 + JSX(classic) → `React.createElement`
 * - ESM import/export → CommonJS `require`/`exports`
 *
 * 변환 결과는 `require`/`module`/`exports` 가 주어진 스코프에서 실행되어야 하며,
 * 'react' / 'react-dom' 은 샌드박스 iframe 에 주입된 React UMD 전역으로 연결된다
 * (TsxRenderer 참고). 컴파일은 전적으로 로컬에서 일어나 오프라인으로 동작한다.
 */
export function compileTsx(source: string): { js: string } | { error: string } {
  try {
    const { code } = transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'classic',
      production: true,
    })
    return { js: code }
  } catch (err) {
    return { error: formatError(err) }
  }
}

/** Sucrase 파싱 에러를 줄 번호 포함 한 줄 메시지로 정리한다. */
function formatError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
