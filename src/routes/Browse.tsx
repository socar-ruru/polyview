import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Source, TreeFile } from '@/lib/sources'
import { FileNotFoundError, FileTooLargeError } from '@/lib/sources'
import { renderKindOf, isOpenApiDocument, shikiLanguageOf } from '@/lib/extensions'
import { errorMessage } from '@/lib/format'
import { DEFAULT_APP_TITLE } from '@/lib/constants'
import { useSettings } from '@/lib/settings-context'
import { AppHeader } from '@/components/AppHeader'
import { FileTree } from '@/components/FileTree'
import { Viewer, type ViewerFile } from '@/components/Viewer'

/** 활성 소스에서 트리와 선택된 파일을 읽어 보여주는 메인 화면. */
export function Browse() {
  const { loading, settings, source, sourceError } = useSettings()
  const params = useParams()
  const path = params['*'] ?? ''
  const title = settings?.appTitle || DEFAULT_APP_TITLE

  if (loading) {
    return <Centered>불러오는 중…</Centered>
  }

  if (!source) {
    return (
      <Shell title={title} sidebar={null}>
        <Notice tone="muted" heading="소스가 구성되지 않았습니다">
          {sourceError ?? '설정에서 로컬 디렉터리나 GitHub 저장소를 지정하세요.'}{' '}
          <Link to="/settings" className="text-accent underline">
            설정 열기
          </Link>
        </Notice>
      </Shell>
    )
  }

  return <Loaded source={source} path={path} title={title} />
}

function Loaded({
  source,
  path,
  title,
}: {
  source: Source
  path: string
  title: string
}) {
  const [files, setFiles] = useState<TreeFile[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [file, setFile] = useState<ViewerFile | null>(null)

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

  // 선택된 파일 — 소스나 경로가 바뀔 때마다 다시 읽는다.
  useEffect(() => {
    let cancelled = false
    if (!path) {
      setFile(null)
      return
    }
    setFile(null)
    loadFile(source, path).then((loaded) => {
      if (!cancelled) setFile(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [source, path])

  if (listError !== null) {
    return (
      <Shell title={title} sidebar={null}>
        <Notice tone="error" heading="파일 목록을 불러오지 못했습니다">
          {listError}
        </Notice>
      </Shell>
    )
  }

  return (
    <Shell
      title={title}
      sidebar={files ? <FileTree files={files} currentPath={path} /> : <SidebarLoading />}
    >
      {!path ? (
        <Notice tone="muted" heading="파일을 선택하세요">
          왼쪽 사이드바에서 파일을 고르면 미리보기가 표시됩니다. tsx, html, markdown, OpenAPI
          스펙은 렌더링되고 나머지는 원본 텍스트로 보여집니다.
        </Notice>
      ) : file ? (
        <Viewer key={file.path} file={file} />
      ) : (
        <Centered>파일을 여는 중…</Centered>
      )}
    </Shell>
  )
}

/**
 * 선택된 파일을 활성 소스에서 읽어 ViewerFile 로 만든다(이전 서버 loadFile 의 클라이언트판).
 * 최대 파일 크기 제한은 소스 인스턴스가 생성 시점에 갖고 있으므로 여기서 따로 넘기지 않는다.
 */
async function loadFile(source: Source, path: string): Promise<ViewerFile> {
  const kind = renderKindOf(path)
  if (kind === 'image') {
    try {
      return { path, kind, imageUrl: await source.readDataUrl(path) }
    } catch (err) {
      return mapLoadError(path, err)
    }
  }
  try {
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
      isOpenApi: kind === 'data' && isOpenApiDocument(text),
      highlightedHtml,
    }
  } catch (err) {
    return mapLoadError(path, err)
  }
}

function mapLoadError(path: string, err: unknown): ViewerFile {
  if (err instanceof FileTooLargeError) return { path, kind: 'too-large', size: err.size }
  if (err instanceof FileNotFoundError) return { path, kind: 'not-found' }
  return { path, kind: 'error', error: errorMessage(err) }
}

// ─── 레이아웃 기본 요소 ──────────────────────────────────────────────────────

function Shell({
  title,
  sidebar,
  children,
}: {
  title: string
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col">
      <AppHeader title={title} />
      <div className="flex min-h-0 flex-1">
        {sidebar !== null && (
          <aside className="w-72 shrink-0 overflow-y-auto border-r border-line bg-subtle/60">
            {sidebar}
          </aside>
        )}
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

function SidebarLoading() {
  return <p className="px-3 py-3 text-xs text-muted">목록 불러오는 중…</p>
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
