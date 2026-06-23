import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { open } from '@tauri-apps/plugin-dialog'
import {
  type AppSettings,
  type SourceType,
  DEFAULT_SETTINGS,
  saveSettings,
  saveToken,
} from '@/lib/settings'
import { useSettings } from '@/lib/settings-context'
import { errorMessage } from '@/lib/format'
import { AppHeader } from '@/components/AppHeader'
import { ThemeToggle } from '@/components/ThemeToggle'

/** 소스/테마/동작을 직접 수정하는 설정 화면. 저장 시 키체인 토큰까지 함께 반영한다. */
export function Settings() {
  const { settings, hasToken, reload } = useSettings()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<AppSettings>(settings ?? DEFAULT_SETTINGS)
  const [tokenInput, setTokenInput] = useState('')
  const [clearToken, setClearToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 컨텍스트가 설정을 늦게 읽어올 수 있으므로, 도착하면 폼 초안을 한 번 동기화한다.
  useEffect(() => {
    if (settings) setDraft(settings)
  }, [settings])

  const title = draft.appTitle || DEFAULT_SETTINGS.appTitle

  async function pickFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '뷰어 루트 디렉터리 선택',
    })
    if (typeof selected === 'string') {
      setDraft((d) => ({ ...d, local: { root: selected } }))
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveSettings(draft)
      if (clearToken) {
        await saveToken(null)
      } else if (tokenInput.trim()) {
        await saveToken(tokenInput)
      }
      await reload()
      navigate('/browse')
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <AppHeader title={title} />
      <main className="min-h-0 flex-1 overflow-auto px-6 py-8 md:px-10">
        <div className="mx-auto max-w-2xl space-y-8">
          <Section title="테마">
            <Row label="색상 모드" hint="Light / Dark / System (기본 System)">
              <ThemeToggle />
            </Row>
          </Section>

          <Section title="소스">
            <div className="space-y-4 rounded-lg border border-line bg-subtle/60 p-4">
              <SourceTypeToggle
                value={draft.sourceType}
                onChange={(sourceType) => setDraft((d) => ({ ...d, sourceType }))}
              />

              {draft.sourceType === 'local' ? (
                <Field label="루트 디렉터리">
                  <div className="flex gap-2">
                    <input
                      value={draft.local.root}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, local: { root: e.target.value } }))
                      }
                      placeholder="/Users/me/project/docs"
                      className={inputClass}
                    />
                    <button onClick={pickFolder} className={secondaryButtonClass} type="button">
                      폴더 선택
                    </button>
                  </div>
                </Field>
              ) : (
                <>
                  <Field label="저장소 (owner/name)">
                    <input
                      value={draft.github.repo}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, github: { ...d.github, repo: e.target.value } }))
                      }
                      placeholder="octocat/hello-world"
                      className={inputClass}
                    />
                  </Field>
                  <div className="flex gap-3">
                    <Field label="브랜치" className="flex-1">
                      <input
                        value={draft.github.branch}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            github: { ...d.github, branch: e.target.value },
                          }))
                        }
                        placeholder="main"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="하위 경로 (선택)" className="flex-1">
                      <input
                        value={draft.github.basePath}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            github: { ...d.github, basePath: e.target.value },
                          }))
                        }
                        placeholder="docs"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <Field
                    label="Personal Access Token"
                    hint={
                      hasToken
                        ? '토큰이 키체인에 저장되어 있습니다. 다시 입력하면 교체됩니다.'
                        : 'repo 읽기 권한이 있는 토큰을 입력하세요. OS 키체인에 안전하게 저장됩니다.'
                    }
                  >
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => {
                        setTokenInput(e.target.value)
                        setClearToken(false)
                      }}
                      placeholder={hasToken ? '저장된 토큰 유지' : 'github_pat_… 또는 ghp_…'}
                      className={inputClass}
                      autoComplete="off"
                    />
                    {hasToken && (
                      <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={clearToken}
                          onChange={(e) => {
                            setClearToken(e.target.checked)
                            if (e.target.checked) setTokenInput('')
                          }}
                        />
                        저장된 토큰 지우기
                      </label>
                    )}
                  </Field>
                </>
              )}
            </div>
          </Section>

          <Section title="동작">
            <div className="space-y-4 rounded-lg border border-line bg-subtle/60 p-4">
              <Field label="앱 타이틀">
                <input
                  value={draft.appTitle}
                  onChange={(e) => setDraft((d) => ({ ...d, appTitle: e.target.value }))}
                  placeholder="Polyview"
                  className={inputClass}
                />
              </Field>
              <Field
                label="본문 글꼴"
                hint="비우면 OS 시스템 폰트를 사용합니다. CSS font-family 값을 직접 입력할 수도 있습니다."
              >
                <input
                  value={draft.fontFamily}
                  onChange={(e) => setDraft((d) => ({ ...d, fontFamily: e.target.value }))}
                  placeholder="시스템 기본 (예: Pretendard, 'Apple SD Gothic Neo')"
                  className={inputClass}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FONT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, fontFamily: preset.value }))}
                      className={`rounded border px-2 py-1 text-xs transition-colors ${
                        draft.fontFamily === preset.value
                          ? 'border-accent text-accent'
                          : 'border-line text-muted hover:bg-hover/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p
                  className="mt-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-fg"
                  style={{ fontFamily: draft.fontFamily || undefined }}
                >
                  미리보기 — 다람쥐 헌 쳇바퀴에 타고파. The quick brown fox 0123456789
                </p>
              </Field>
              <div className="flex gap-3">
                <Field label="최대 파일 크기 (MB)" className="flex-1">
                  <input
                    type="number"
                    min={1}
                    value={Math.round(draft.maxFileBytes / (1024 * 1024))}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        maxFileBytes: Math.max(1, Number(e.target.value) || 1) * 1024 * 1024,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="캐시 TTL (초)" className="flex-1">
                  <input
                    type="number"
                    min={0}
                    value={draft.cacheTtlSeconds}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        cacheTtlSeconds: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {error && (
            <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button onClick={() => navigate('/browse')} className={secondaryButtonClass} type="button">
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={primaryButtonClass}
              type="button"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── 작은 UI 조각들 ────────────────────────────────────────────────────────────

function SourceTypeToggle({
  value,
  onChange,
}: {
  value: SourceType
  onChange: (value: SourceType) => void
}) {
  const options: Array<{ value: SourceType; label: string }> = [
    { value: 'local', label: '로컬 디렉터리' },
    { value: 'github', label: 'GitHub 저장소' },
  ]
  return (
    <div className="inline-flex rounded-md border border-line p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value ? 'bg-accent text-white' : 'text-muted hover:bg-hover/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-subtle/60 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-fg">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

// 글꼴 빠른 선택 프리셋. 빈 값은 시스템 기본을 뜻하고, 나머지는 미설치 시
// 일반 sans-serif 로 자연스럽게 폴백하도록 generic 패밀리를 덧붙인다.
const FONT_PRESETS: Array<{ label: string; value: string }> = [
  { label: '시스템 기본', value: '' },
  { label: 'Pretendard', value: 'Pretendard, sans-serif' },
  { label: 'Apple SD Gothic Neo', value: "'Apple SD Gothic Neo', sans-serif" },
  { label: 'Noto Sans KR', value: "'Noto Sans KR', sans-serif" },
]

const inputClass =
  'w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm text-fg outline-none focus:border-accent'
const primaryButtonClass =
  'rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50'
const secondaryButtonClass =
  'whitespace-nowrap rounded-md border border-line bg-canvas px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-hover/50'
