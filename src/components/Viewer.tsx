'use client'

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
  /** Server-rendered Shiki HTML for the raw/data code view. */
  highlightedHtml?: string
  size?: number
  isOpenApi?: boolean
  error?: string
}

type DataTab = 'raw' | 'openapi'

export function Viewer({ file }: { file: ViewerFile }) {
  const showTabs = file.kind === 'data' && file.isOpenApi === true
  // OpenAPI specs open in the rendered OpenAPI view by default; the Viewer is
  // keyed on file.path so this initial value is re-evaluated per file.
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
      return <ImageBody path={file.path} />
    case 'data':
      if (file.isOpenApi === true && tab === 'openapi') {
        return <OpenApiRenderer content={file.content ?? ''} />
      }
    // falls through — data without the OpenAPI tab renders like raw code
    case 'raw':
      return <CodeRenderer html={file.highlightedHtml ?? ''} filename={basename(file.path)} />
    case 'too-large':
      return (
        <Message heading="File too large to preview">
          This file is {formatBytes(file.size ?? 0)} and exceeds the configured limit.{' '}
          <RawLink path={file.path}>Download raw</RawLink>.
        </Message>
      )
    case 'not-found':
      return <Message heading="File not found">It may have been moved or deleted.</Message>
    default:
      return (
        <Message heading="Could not load file" tone="error">
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

function ImageBody({ path }: { path: string }) {
  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-subtle p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rawUrl(path)} alt={path} className="max-h-full max-w-full object-contain" />
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

function RawLink({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <a className="text-accent underline" href={rawUrl(path)} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

function rawUrl(path: string): string {
  return `/api/raw?path=${encodeURIComponent(path)}`
}
