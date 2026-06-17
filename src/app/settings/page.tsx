import { getConfig } from '@/lib/config'
import { getSource, type SourceDetail } from '@/lib/sources'
import { AppHeader } from '@/components/AppHeader'
import { ConfigError } from '@/components/ConfigError'
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
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-1 text-lg font-semibold">소스 정보</h1>
          <p className="mb-6 text-sm text-neutral-500">
            현재 이 뷰어가 참고하고 있는 소스와 설정입니다. 변경하려면 환경 변수를 수정한 뒤
            재시작하세요.
          </p>
          <dl className="overflow-hidden rounded-lg border border-neutral-200">
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`flex gap-4 px-4 py-3 text-sm ${
                  i % 2 ? 'bg-white' : 'bg-neutral-50/60'
                }`}
              >
                <dt className="w-40 shrink-0 font-medium text-neutral-500">{row.label}</dt>
                <dd className="min-w-0 break-all font-mono text-neutral-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  )
}
