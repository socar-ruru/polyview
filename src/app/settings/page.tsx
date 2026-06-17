import { getConfig } from '@/lib/config'
import { getSource, type SourceDetail } from '@/lib/sources'
import { AppHeader } from '@/components/AppHeader'
import { ConfigError } from '@/components/ConfigError'
import { ThemeToggle } from '@/components/ThemeToggle'
import { formatBytes } from '@/lib/format'

export const dynamic = 'force-dynamic'

/**
 * Read-only view of the active source and operational settings. Everything is
 * computed on the server; the token is never sent to the client — only the
 * masked hint produced by the source's describe() reaches the page.
 */
export default function SettingsPage() {
  let title: string
  let rows: SourceDetail[]
  try {
    const cfg = getConfig()
    title = cfg.appTitle
    const info = getSource().describe()
    rows = [
      { label: '소스 타입', value: info.label },
      { label: '위치', value: info.location },
      ...info.details,
      { label: 'Basic Auth', value: cfg.basicAuth ? '활성' : '비활성' },
      { label: 'Cache TTL', value: `${cfg.cacheTtlSeconds}초` },
      { label: '최대 파일 크기', value: formatBytes(cfg.maxFileBytes) },
      { label: '앱 타이틀', value: cfg.appTitle },
    ]
  } catch (err) {
    return <ConfigError message={err instanceof Error ? err.message : String(err)} />
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader title={title} />
      <main className="min-h-0 flex-1 overflow-auto px-6 py-8 md:px-10">
        <div className="mx-auto max-w-2xl space-y-8">
          <section>
            <h2 className="mb-3 text-base font-semibold text-fg">테마</h2>
            <div className="flex items-center justify-between rounded-lg border border-line bg-subtle/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-fg">색상 모드</p>
                <p className="text-xs text-muted">Light / Dark / System (기본 System)</p>
              </div>
              <ThemeToggle />
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold text-fg">소스 정보</h2>
            <p className="mb-3 text-sm text-muted">
              현재 이 뷰어가 참고하고 있는 소스와 설정입니다. 변경하려면 환경 변수를 수정한 뒤
              재시작하세요.
            </p>
            <dl className="overflow-hidden rounded-lg border border-line">
              {rows.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex gap-4 px-4 py-3 text-sm ${i % 2 ? 'bg-canvas' : 'bg-subtle/60'}`}
                >
                  <dt className="w-40 shrink-0 font-medium text-muted">{row.label}</dt>
                  <dd className="min-w-0 break-all font-mono text-fg">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
    </div>
  )
}
