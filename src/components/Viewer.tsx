import { useRef, useState } from 'react'
import type { RenderKind } from '@/lib/extensions'
import { extensionOf } from '@/lib/extensions'
import { formatBytes } from '@/lib/format'
import { basename } from '@/lib/paths'
import { ChevronRightIcon } from '@/components/icons'
import { MarkdownRenderer } from '@/components/renderers/MarkdownRenderer'
import { HtmlRenderer } from '@/components/renderers/HtmlRenderer'
import { TsxRenderer } from '@/components/renderers/TsxRenderer'
import { CodeRenderer } from '@/components/renderers/CodeRenderer'
import { OpenApiRenderer } from '@/components/renderers/OpenApiRenderer'

export interface ViewerFile {
  path: string
  kind: RenderKind | 'too-large' | 'not-found' | 'error'
  content?: string
  /** Shiki 로 강조된 raw/data 코드 뷰 HTML. */
  highlightedHtml?: string
  /** 이미지 표시용 data URL. */
  imageUrl?: string
  size?: number
  /** 텍스트 파일의 줄 수. 로드 시 1회 계산해 둔다(상태바 표시용). */
  lineCount?: number
  isOpenApi?: boolean
  error?: string
}

type DataTab = 'raw' | 'openapi'

export function Viewer({ file }: { file: ViewerFile }) {
  const showTabs = file.kind === 'data' && file.isOpenApi === true
  // OpenAPI 스펙은 기본으로 렌더링된 OpenAPI 뷰로 열린다.
  const [tab, setTab] = useState<DataTab>(file.isOpenApi === true ? 'openapi' : 'raw')

  // Viewer 는 더 이상 file.path 를 key 로 remount 하지 않는다(무거운 렌더러 재마운트
  // 방지). 대신 파일이 바뀌면 탭만 기본값으로 되돌린다 — setState-during-render
  // 패턴이라 커밋 전에 즉시 재조정되어 깜빡임이 없다.
  const prevPath = useRef(file.path)
  if (prevPath.current !== file.path) {
    prevPath.current = file.path
    setTab(file.isOpenApi === true ? 'openapi' : 'raw')
  }

  return (
    <div className="flex h-full flex-col">
      {/* 상단바가 없어 콘텐츠가 최상단에 붙으므로, 이 헤더의 빈 영역을 드래그하면
          창이 움직이도록 data-tauri-drag-region 을 둔다(브레드크럼·세그먼트 버튼은
          자기 클릭을 그대로 처리). */}
      <header
        data-tauri-drag-region
        className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Breadcrumb path={file.path} />
          <TypeBadge file={file} />
        </div>
        {showTabs && <Segmented tab={tab} onChange={setTab} />}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Body file={file} tab={tab} />
      </div>
      <StatusBar file={file} />
    </div>
  )
}

function Body({ file, tab }: { file: ViewerFile; tab: DataTab }) {
  switch (file.kind) {
    case 'markdown':
      return (
        <ScrollArea>
          <MarkdownRenderer content={file.content ?? ''} />
        </ScrollArea>
      )
    case 'html':
      return <HtmlRenderer content={file.content ?? ''} />
    case 'tsx':
      return <TsxRenderer code={file.content ?? ''} />
    case 'image':
      return <ImageBody url={file.imageUrl} path={file.path} />
    case 'data':
      if (file.isOpenApi === true && tab === 'openapi') {
        return <OpenApiRenderer content={file.content ?? ''} />
      }
    // falls through — OpenAPI 탭이 없는 data 는 raw 코드처럼 렌더링된다
    case 'raw':
      return <CodeRenderer html={file.highlightedHtml ?? ''} filename={basename(file.path)} />
    case 'too-large':
      return (
        <Message heading="파일이 너무 커서 미리보기할 수 없습니다">
          이 파일은 {formatBytes(file.size ?? 0)} 로 설정된 한도를 초과합니다. 설정에서 최대 파일
          크기를 늘릴 수 있습니다.
        </Message>
      )
    case 'not-found':
      return <Message heading="파일을 찾을 수 없습니다">이동되었거나 삭제되었을 수 있습니다.</Message>
    default:
      return (
        <Message heading="파일을 불러오지 못했습니다" tone="error">
          {file.error ?? 'Unknown error'}
        </Message>
      )
  }
}

// ─── 헤더 조각 ───────────────────────────────────────────────────────────────

/** 경로를 디렉터리(연함) + 파일명(진함)으로 나눠 보여주는 브레드크럼. */
function Breadcrumb({ path }: { path: string }) {
  const slash = path.lastIndexOf('/')
  const dir = slash === -1 ? '' : path.slice(0, slash)
  const name = path.slice(slash + 1)
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs">
      {dir && (
        <>
          <span className="truncate text-muted">{dir}</span>
          <ChevronRightIcon className="h-3 w-3 shrink-0 text-muted/60" />
        </>
      )}
      <span className="shrink-0 font-medium text-fg">{name}</span>
    </div>
  )
}

/** 파일 종류 배지(OpenAPI / 확장자). */
function TypeBadge({ file }: { file: ViewerFile }) {
  return (
    <span className="shrink-0 rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
      {typeLabel(file)}
    </span>
  )
}

function Segmented({ tab, onChange }: { tab: DataTab; onChange: (tab: DataTab) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-line p-0.5 text-xs">
      <SegButton active={tab === 'raw'} onClick={() => onChange('raw')}>
        Raw
      </SegButton>
      <SegButton active={tab === 'openapi'} onClick={() => onChange('openapi')}>
        OpenAPI
      </SegButton>
    </div>
  )
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2.5 py-1 font-medium transition-colors ${
        active ? 'bg-accent text-white' : 'text-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}

/** 하단 상태바: 타입 · 크기 · 줄 수 · 인코딩. 에러/누락 상태에선 숨긴다. */
function StatusBar({ file }: { file: ViewerFile }) {
  const items = statusItems(file)
  if (!items) return null
  return (
    <div className="flex h-6 shrink-0 items-center border-t border-line px-4 text-[11px] text-muted">
      {items.join('  ·  ')}
    </div>
  )
}

function statusItems(file: ViewerFile): string[] | null {
  if (file.kind === 'too-large' || file.kind === 'not-found' || file.kind === 'error') {
    return null
  }
  const items = [typeLabel(file)]
  if (file.size != null) items.push(formatBytes(file.size))
  if (file.lineCount != null) {
    items.push(`${file.lineCount} lines`)
    items.push('UTF-8')
  }
  return items
}

function typeLabel(file: ViewerFile): string {
  if (file.isOpenApi === true) return 'OpenAPI'
  return extensionOf(file.path).toUpperCase() || 'TXT'
}

function ScrollArea({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-auto px-6 py-5 md:px-10">{children}</div>
}

function ImageBody({ url, path }: { url?: string; path: string }) {
  if (!url) {
    return <Message heading="이미지를 불러오지 못했습니다">{path}</Message>
  }
  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-subtle p-6">
      <img src={url} alt={path} className="max-h-full max-w-full object-contain" />
    </div>
  )
}

function Message({
  heading,
  tone,
  children,
}: {
  heading: string
  tone?: 'error'
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h2 className={`mb-2 text-base font-semibold ${tone === 'error' ? 'text-error' : 'text-fg'}`}>
          {heading}
        </h2>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </div>
  )
}
