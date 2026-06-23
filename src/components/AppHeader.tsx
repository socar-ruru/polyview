import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'

/** 탐색·설정 페이지 공용 상단 바: 타이틀 + 테마 토글 + 설정 버튼. */
export function AppHeader({ title }: { title: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
      <Link to="/browse" className="text-sm font-semibold tracking-tight text-fg">
        {title}
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          to="/settings"
          title="설정"
          aria-label="설정"
          className="text-muted transition-colors hover:text-fg"
        >
          <GearIcon />
        </Link>
      </div>
    </header>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
