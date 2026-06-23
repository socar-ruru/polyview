import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const host = process.env.TAURI_DEV_HOST

/**
 * React / ReactDOM UMD 프로덕션 빌드를 문자열로 노출하는 가상 모듈
 * (`virtual:react-umd`). TSX 미리보기 iframe 에 주입해 CDN 없이 오프라인으로
 * React 를 실행하기 위함이다. React 18 의 package.json `exports` 가 `./umd/*` 를
 * 막으므로, package.json 위치를 기준으로 파일을 직접 읽어 우회한다.
 */
function reactUmdPlugin(): Plugin {
  const require = createRequire(import.meta.url)
  const VIRTUAL_ID = 'virtual:react-umd'
  const RESOLVED_ID = '\0' + VIRTUAL_ID
  return {
    name: 'react-umd',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      const reactDir = dirname(require.resolve('react/package.json'))
      const reactDomDir = dirname(require.resolve('react-dom/package.json'))
      const reactUmd = readFileSync(join(reactDir, 'umd/react.production.min.js'), 'utf8')
      const reactDomUmd = readFileSync(join(reactDomDir, 'umd/react-dom.production.min.js'), 'utf8')
      return `export const reactUmd = ${JSON.stringify(reactUmd)}\nexport const reactDomUmd = ${JSON.stringify(reactDomUmd)}`
    },
  }
}

// https://vite.dev/config/ — tuned for Tauri (fixed port, no rust-error clobbering).
export default defineConfig({
  plugins: [react(), reactUmdPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
