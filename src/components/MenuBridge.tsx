import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { useTheme } from '@/lib/theme'
import { useSettings } from '@/lib/settings-context'
import { DEFAULT_SETTINGS, saveSettings } from '@/lib/settings'
import { clearCache } from '@/lib/cache'

/**
 * 네이티브 macOS 메뉴(lib.rs)가 던지는 'menu' 이벤트를 받아 React 액션으로 잇는다.
 * predefined 항목(복사·종료 등)은 OS 가 처리하므로 여기서는 커스텀 항목만 다룬다.
 * 렌더링은 하지 않는다(이펙트만). ThemeProvider·SettingsProvider·Router 안에서
 * 마운트되어야 useTheme/useSettings/useNavigate 를 쓸 수 있다.
 */
export function MenuBridge() {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { settings, reload } = useSettings()

  // 최신 컨텍스트 값을 ref 에 담아, 리스너는 마운트 시 한 번만 등록한다(설정이
  // 바뀔 때마다 재구독하면서 비동기 unlisten 과 경합하는 것을 피한다).
  const actionRef = useRef<(action: string) => void>(() => {})
  actionRef.current = (action) => {
    switch (action) {
      case 'settings':
        navigate('/settings')
        break
      case 'open_folder':
        void openFolder()
        break
      case 'reload':
        clearCache()
        void reload()
        break
      case 'theme_light':
        setTheme('light')
        break
      case 'theme_dark':
        setTheme('dark')
        break
      case 'theme_system':
        setTheme('system')
        break
    }
  }

  // 폴더를 고르면 로컬 소스로 전환·저장하고 소스를 재구성한다(설정 화면의
  // pickFolder 와 동일한 동작을 메뉴/⌘O 로도 제공). 소스가 바뀌므로 'reload'
  // 액션과 동일하게 캐시를 비워, 이전 폴더의 캐시 항목이 남지 않게 한다.
  async function openFolder() {
    const selected = await open({ directory: true, multiple: false, title: '뷰어 루트 디렉터리 선택' })
    if (typeof selected !== 'string') return
    const current = settings ?? DEFAULT_SETTINGS
    await saveSettings({ ...current, sourceType: 'local', local: { root: selected } })
    clearCache()
    await reload()
    navigate('/browse')
  }

  useEffect(() => {
    const unlisten = listen<string>('menu', (event) => actionRef.current(event.payload))
    return () => {
      void unlisten.then((dispose) => dispose())
    }
  }, [])

  return null
}
