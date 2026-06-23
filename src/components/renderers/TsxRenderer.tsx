import { useMemo } from 'react'
import { useColorScheme } from '@/lib/theme'
import { compileTsx } from '@/lib/tsx-compiler'
import { reactUmd, reactDomUmd } from '@/lib/react-runtime'

/**
 * 단일 .tsx 파일을 Sucrase 로 로컬에서 변환(@/lib/tsx-compiler)한 뒤, React UMD
 * 전역과 함께 샌드박스 iframe 에 주입해 실행한다. 네트워크/서버를 전혀 거치지
 * 않으므로 완전 오프라인으로 동작한다.
 */
export function TsxRenderer({ code }: { code: string }) {
  const colorScheme = useColorScheme()

  // 변환과 srcDoc 생성을 한 memo 로 묶어 hook 순서를 안정적으로 유지한다.
  const compiled = useMemo(() => {
    const result = compileTsx(code)
    return 'error' in result ? result : { srcDoc: buildSrcDoc(result.js) }
  }, [code])

  if ('error' in compiled) {
    return (
      <div className="h-full overflow-auto bg-canvas p-6">
        <h2 className="mb-2 text-sm font-semibold text-error">컴파일 실패</h2>
        <pre className="overflow-x-auto rounded-lg border border-line bg-subtle p-4 text-xs text-fg">
          {compiled.error}
        </pre>
      </div>
    )
  }

  return (
    <iframe
      title="tsx preview"
      sandbox="allow-scripts"
      className="h-full w-full border-0"
      style={{ colorScheme }}
      srcDoc={compiled.srcDoc}
    />
  )
}

function buildSrcDoc(js: string): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><style>html,body{margin:0;height:100%}#root{min-height:100%}</style></head>
  <body>
    <div id="root"></div>
    <script>${escapeScript(reactUmd)}</script>
    <script>${escapeScript(reactDomUmd)}</script>
    <script>
      (function () {
        function require(name) {
          if (name === 'react') return window.React;
          if (name === 'react-dom' || name === 'react-dom/client') return window.ReactDOM;
          throw new Error('모듈을 찾을 수 없습니다: ' + name);
        }
        var module = { exports: {} };
        var exports = module.exports;
        try {
${escapeScript(js)}
          var Component = (module.exports && module.exports.default) || module.exports;
          if (typeof Component !== 'function' && (typeof Component !== 'object' || Component === null)) {
            throw new Error('export default 로 React 컴포넌트를 내보내야 합니다');
          }
          window.ReactDOM.createRoot(document.getElementById('root')).render(
            window.React.createElement(window.React.StrictMode, null, window.React.createElement(Component))
          );
        } catch (err) {
          document.body.innerHTML =
            '<pre style="margin:0;padding:16px;color:#cf222e;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap">' +
            String((err && err.stack) || err) +
            '</pre>';
        }
      })();
    </script>
  </body>
</html>`
}

/** iframe 안의 인라인 스크립트가 "</script>" 로 조기 종료되지 않도록 이스케이프. */
function escapeScript(s: string): string {
  return s.replace(/<\/(script)/gi, '<\\/$1')
}
