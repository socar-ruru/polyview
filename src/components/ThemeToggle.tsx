import { useTheme } from '@/lib/theme'
import { MonitorIcon, MoonIcon, SunIcon } from '@/components/icons'

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
] as const

/** Light / Dark / System 세그먼트 컨트롤. 선택값은 테마 프로바이더를 통해 유지된다. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-line p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            theme === value ? 'bg-accent text-white' : 'text-muted hover:bg-hover/50'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
