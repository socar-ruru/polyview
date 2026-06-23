import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { ThemeProvider } from '@/lib/theme'
import { SettingsProvider } from '@/lib/settings-context'
import '@/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root 엘리먼트를 찾을 수 없습니다')

createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        {/*
          라우트 상태를 메모리에 둔다(URL 해시를 쓰지 않는다). Scalar(OpenAPI
          뷰)가 사이드바 네비게이션에 window.location.hash 를 통째로 쓰는데,
          HashRouter 와 해시를 공유하면 서로 덮어써 파일/메뉴가 사라진다.
          데스크탑 앱이라 URL 딥링크가 필요 없으므로 해시를 Scalar 에 양보한다.
        */}
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
