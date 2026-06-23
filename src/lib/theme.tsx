import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * next-themes 를 대체하는 경량 테마 프로바이더. 환경설정을 localStorage 에
 * 저장하고, 해석된 색상(light/dark)을 <html> 의 `.dark` 클래스에 반영한다.
 * 'system' 일 때는 OS 의 prefers-color-scheme 변화를 구독한다.
 */
export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'polyview-theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  /** 실제로 적용된 색상. 'system' 은 OS 설정에 따라 light/dark 로 해석된다. */
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage 접근 불가(시크릿 모드 등) — 기본값으로 진행
  }
  return 'system'
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark)

  // OS 색상 환경설정 변화 구독 (theme 이 'system' 일 때만 의미가 있다).
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  // 해석된 색상을 <html> 클래스에 반영. globals.css 의 CSS 변수가 이 클래스로 뒤집힌다.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 저장 실패는 무시 — 이번 세션에만 적용된다
    }
    setThemeState(next)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 는 ThemeProvider 안에서만 사용할 수 있습니다')
  return ctx
}

/**
 * 스스로 테마를 입히는 렌더 엔진(Mermaid, Scalar, 샌드박스 iframe)을 위한
 * 해석된 색상. 기본값은 'light'.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useTheme().resolvedTheme
}

const SYSTEM_FONT_FALLBACK = 'system-ui, sans-serif'

/**
 * 현재 앱 본문 글꼴 스택(`--font-sans`). 부모 문서를 상속하지 못하는 샌드박스
 * iframe(HTML/TSX 렌더러)에 기본 글꼴을 주입할 때 쓴다. 설정에서 글꼴을
 * 지정했으면 그 값을, 아니면 index.css 의 시스템 폰트 기본값을 돌려준다.
 */
export function getAppFontStack(): string {
  if (typeof document === 'undefined') return SYSTEM_FONT_FALLBACK
  const value = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim()
  return value || SYSTEM_FONT_FALLBACK
}
