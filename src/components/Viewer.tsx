import { useState } from 'react'
import type { RenderKind } from '@/lib/extensions'
import { formatBytes } from '@/lib/format'
import { basename } from '@/lib/paths'
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
  isOpenApi?: boolean
  error?: string
}

type DataTab = 'raw' | 'openapi'

export function Viewer({ file }: { file: ViewerFile }) {
  const showTabs = file.kind === 'data' && file.isOpenApi === true
  // OpenAPI 스펙은 기본으로 렌더링된 OpenAPI 뷰로 열린다. Viewer 는
  // file.path 를 key 로 사용하므로 이 초기값은 파일마다 재평가된다.
  const [tab, setTab] = useState<DataTab>(file.isOpenApi === true ? 'openapi' : 'raw')

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <span className="truncate font-mono text-xs text-muted">{file.path}</span>
        {showTabs ? (
          <div className="flex items-center gap-1 text-xs">
            <TabButton active={tab === 'raw'} onClick={() => setTab('raw')}>
              Raw
            </TabButton>
            <TabButton active={tab === 'openapi'} onClick={() => setTab('openapi')}>
              OpenAPI
            </TabButton>
          </div>
        ) : (
          <span />
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Body file={file} tab={tab} />
      </div>
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

function TabButton({
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
      className={`rounded px-2 py-1 font-medium transition-colors ${
        active ? 'bg-accent text-white' : 'text-muted hover:bg-hover/50'
      }`}
    >
      {children}
    </button>
  )
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
