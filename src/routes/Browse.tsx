import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { Source, TreeFile } from '@/lib/sources'
import { FileNotFoundError, FileTooLargeError } from '@/lib/sources'
import { renderKindOf, isOpenApiDocument, shikiLanguageOf } from '@/lib/extensions'
import { cached } from '@/lib/cache'
import { errorMessage } from '@/lib/format'
import { basename } from '@/lib/paths'
import { DEFAULT_APP_TITLE } from '@/lib/constants'
import { type AppSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { useSettings } from '@/lib/settings-context'
import { TitleBar } from '@/components/TitleBar'
import { FileTree } from '@/components/FileTree'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SettingsIcon } from '@/components/icons'
import { Viewer, type ViewerFile } from '@/components/Viewer'

// 현재 윈도우 핸들. setTitle 호출마다 새 Window 객체를 만들지 않도록 모듈 스코프에 둔다.
const appWindow = getCurrentWindow()

/** 활성 소스에서 트리와 선택된 파일을 읽어 보여주는 메인 화면. */
export function Browse() {
  const { loading, settings, source, sourceError } = useSettings()
  const params = useParams()
  const path = params['*'] ?? ''
  const title = settings?.appTitle || DEFAULT_APP_TITLE
  const sourceLabel = settings ? sourceLabelOf(settings) : undefined
  // 로컬 소스일 때만 파일 경로 동작(복사·Finder)을 켜기 위한 루트 경로.
  const localRoot =
    settings?.sourceType === 'local' && settings.local.root ? settings.local.root : undefined

  // 선택된 파일명을 네이티브 윈도우 타이틀에 반영한다(미션 컨트롤·창 전환에서
  // 네이티브 앱처럼 보이도록). 파일이 없으면 앱 타이틀만 표시.
  useEffect(() => {
    const label = path ? `${basename(path)} — ${title}` : title
    void appWindow.setTitle(label)
  }, [path, title])

  if (loading) {
    return <Centered>불러오는 중…</Centered>
  }

  if (!source) {
    return (
      <Shell sidebar={null}>
        <Notice tone="muted" heading="소스가 구성되지 않았습니다">
          {sourceError ?? '설정에서 로컬 디렉터리나 GitHub 저장소를 지정하세요.'}{' '}
          <Link to="/settings" className="text-accent underline">
            설정 열기
          </Link>
        </Notice>
      </Shell>
    )
  }

  return (
    <Loaded
      source={source}
      path={path}
      sourceLabel={sourceLabel}
      localRoot={localRoot}
      ttl={settings?.cacheTtlSeconds ?? DEFAULT_SETTINGS.cacheTtlSeconds}
    />
  )
}

/** 활성 소스를 사이드바 상단에 보여줄 짧은 라벨로 만든다. */
function sourceLabelOf(settings: AppSettings): string {
  if (settings.sourceType === 'github') {
    return settings.github.repo ? `GitHub · ${settings.github.repo}` : 'GitHub'
  }
  const root = settings.local.root.trim()
  return root ? `Local · ${basename(root) || root}` : 'Local'
}

function Loaded({
  source,
  path,
  sourceLabel,
  localRoot,
  ttl,
}: {
  source: Source
  path: string
  sourceLabel?: string
  localRoot?: string
  ttl: number
}) {
  const [files, setFiles] = useState<TreeFile[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [file, setFile] = useState<ViewerFile | null>(null)
  const [pending, setPending] = useState(false)

  // 트리 목록 — 소스가 바뀔 때만 다시 읽는다.
  useEffect(() => {
    let cancelled = false
    setFiles(null)
    setListError(null)
    source
      .list()
      .then((result) => {
        if (!cancelled) setFiles(result)
      })
      .catch((err) => {
        if (!cancelled) setListError(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [source])

  // 선택된 파일 — 소스나 경로가 바뀔 때마다 다시 읽는다. 로딩 중에는 이전
  // 내용을 그대로 두어(stale-while-loading) 빈 화면 깜빡임을 없애고, 준비되면
  // 한 번에 교체한다. 캐시 히트면 거의 즉시 끝난다.
  useEffect(() => {
    let cancelled = false
    if (!path) {
      setFile(null)
      setPending(false)
      return
    }
    setPending(true)
    loadFile(source, path, ttl).then((loaded) => {
      if (!cancelled) {
        setFile(loaded)
        setPending(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [source, path, ttl])

  if (listError !== null) {
    return (
      <Shell sidebar={null}>
        <Notice tone="error" heading="파일 목록을 불러오지 못했습니다">
          {listError}
        </Notice>
      </Shell>
    )
  }

  return (
    <Shell
      sidebar={
        files ? (
          <FileTree
            files={files}
            currentPath={path}
            sourceLabel={sourceLabel}
            localRoot={localRoot}
          />
        ) : (
          <SidebarLoading />
        )
      }
    >
      {pending && file && <TopLoadingBar />}
      {!path ? (
        <Notice tone="muted" heading="파일을 선택하세요">
          왼쪽 사이드바에서 파일을 고르면 미리보기가 표시됩니다. tsx, html, markdown, OpenAPI
          스펙은 렌더링되고 나머지는 원본 텍스트로 보여집니다.
        </Notice>
      ) : file ? (
        <Viewer file={file} localRoot={localRoot} />
      ) : (
        <Centered>파일을 여는 중…</Centered>
      )}
    </Shell>
  )
}

/**
 * 선택된 파일을 ViewerFile 로 읽어온다(이전 서버 loadFile 의 클라이언트판).
 * 결과(텍스트 + Shiki 하이라이트)는 소스·경로별로 캐시되므로, 같은 파일로
 * 되돌아오면 IPC 읽기와 하이라이트 재계산 없이 즉시 표시된다. 트리 목록과 동일한
 * TTL 을 따른다. 에러 결과는 캐시하지 않는다(아래 readFile 가 throw 하면 cached 가
 * 항목을 제거한다).
 */
function loadFile(source: Source, path: string, ttl: number): Promise<ViewerFile> {
  return cached(`file:${source.cacheKey()}:${path}`, ttl, () => readFile(source, path)).catch(
    (err) => mapLoadError(path, err),
  )
}

/**
 * 실제 읽기·하이라이트. 에러는 던져서 캐시에 남지 않게 한다. 최대 파일 크기
 * 제한은 소스 인스턴스가 생성 시점에 갖고 있으므로 여기서 따로 넘기지 않는다.
 */
async function readFile(source: Source, path: string): Promise<ViewerFile> {
  const kind = renderKindOf(path)
  if (kind === 'image') {
    return { path, kind, imageUrl: await source.readDataUrl(path) }
  }
  const { text, size } = await source.readText(path)
  // 코드류 파일은 Shiki 로 강조한다. Shiki 모듈은 여기서 처음 동적 import 되어
  // 초기 번들에서 분리된다. markdown/html/tsx 는 각자 렌더러를 쓴다.
  const isCode = kind === 'raw' || kind === 'data'
  let highlightedHtml: string | undefined
  if (isCode) {
    const { highlightCode } = await import('@/lib/highlight')
    highlightedHtml = await highlightCode(text, shikiLanguageOf(path))
  }
  return {
    path,
    kind,
    content: text,
    size,
    lineCount: text.split('\n').length,
    isOpenApi: kind === 'data' && isOpenApiDocument(text),
    highlightedHtml,
  }
}

function mapLoadError(path: string, err: unknown): ViewerFile {
  if (err instanceof FileTooLargeError) return { path, kind: 'too-large', size: err.size }
  if (err instanceof FileNotFoundError) return { path, kind: 'not-found' }
  return { path, kind: 'error', error: errorMessage(err) }
}

// ─── 레이아웃 기본 요소 ──────────────────────────────────────────────────────

function Shell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  // 상단바 없음(Zed/Linear 스타일). 트래픽 라이트 자리는 사이드바 상단의
  // TitleBar 스트립이 비우고, 콘텐츠는 상단 끝까지 올라간다. 사이드바가 없는
  // 상태(미설정·에러)에선 콘텐츠 쪽에 스트립을 둬 라이트 자리를 비운다.
  if (sidebar === null) {
    return (
      <div className="flex h-screen flex-col">
        <TitleBar />
        <main className="relative min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    )
  }
  return (
    <div className="flex h-screen">
      <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-subtle/60">
        <TitleBar />
        <div className="min-h-0 flex-1">{sidebar}</div>
        <SidebarFooter />
      </aside>
      <main className="relative min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  )
}

function SidebarLoading() {
  return <p className="px-3 py-3 text-xs text-muted">목록 불러오는 중…</p>
}

/** 사이드바 하단 푸터: 테마 토글 + 설정. 예전엔 상단 타이틀바에 있던 컨트롤을
 *  여기로 내려 타이틀바를 가볍게 했다. */
function SidebarFooter() {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-line px-2.5 py-2">
      <ThemeToggle />
      <Link
        to="/settings"
        title="설정"
        aria-label="설정"
        className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-hover/50 hover:text-fg"
      >
        <SettingsIcon className="h-[18px] w-[18px]" />
      </Link>
    </div>
  )
}

/**
 * 다음 파일을 읽는 동안(이전 내용은 그대로 보이는 상태) 본문 상단에 뜨는 얇은
 * 진행 표시. 캐시 히트면 거의 보이지 않을 만큼 짧게 스친다.
 */
function TopLoadingBar() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-accent"
    />
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center text-sm text-muted">{children}</div>
  )
}

function Notice({
  tone,
  heading,
  children,
}: {
  tone: 'muted' | 'error'
  heading: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h2 className={`mb-2 text-lg font-semibold ${tone === 'error' ? 'text-error' : 'text-fg'}`}>
          {heading}
        </h2>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </div>
  )
}
