import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
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
        <HashRouter>
          <App />
        </HashRouter>
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
