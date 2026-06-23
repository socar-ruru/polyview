import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Source } from '@/lib/sources/types'
import { errorMessage } from '@/lib/format'
import {
  type AppSettings,
  createSource,
  loadSettings,
  loadToken,
} from '@/lib/settings'

interface SettingsContextValue {
  /** 최초 로드 중인지 여부. */
  loading: boolean
  settings: AppSettings | null
  /** GitHub 토큰이 키체인에 저장되어 있는지. */
  hasToken: boolean
  /** 현재 설정으로 만든 활성 소스. 설정이 불완전하면 null. */
  source: Source | null
  /** 소스를 만들 수 없을 때의 안내 메시지. */
  sourceError: string | null
  /** 설정/토큰을 다시 읽어 소스를 재구성한다 (설정 저장 후 호출). */
  reload: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [hasToken, setHasToken] = useState(false)
  const [source, setSource] = useState<Source | null>(null)
  const [sourceError, setSourceError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [next, token] = await Promise.all([loadSettings(), loadToken()])
      setSettings(next)
      setHasToken(Boolean(token))
      const built = createSource(next, token)
      if ('source' in built) {
        setSource(built.source)
        setSourceError(null)
      } else {
        setSource(null)
        setSourceError(built.error)
      }
    } catch (err) {
      setSource(null)
      setSourceError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // 설정의 글꼴을 문서 전역(--font-sans)에 반영한다. 비어 있으면 인라인 오버라이드를
  // 제거해 index.css 의 시스템 폰트 기본값으로 되돌린다.
  useEffect(() => {
    const family = settings?.fontFamily.trim()
    const root = document.documentElement
    if (family) root.style.setProperty('--font-sans', family)
    else root.style.removeProperty('--font-sans')
  }, [settings?.fontFamily])

  const value: SettingsContextValue = {
    loading,
    settings,
    hasToken,
    source,
    sourceError,
    reload,
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings 는 SettingsProvider 안에서만 사용할 수 있습니다')
  return ctx
}
