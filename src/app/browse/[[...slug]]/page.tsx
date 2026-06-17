import { getConfig } from '@/lib/config'
import { getSource, FileNotFoundError, FileTooLargeError } from '@/lib/sources'
import { renderKindOf, isOpenApiDocument, shikiLanguageOf } from '@/lib/extensions'
import { highlightCode } from '@/lib/highlight'
import { DEFAULT_APP_TITLE } from '@/lib/constants'
import { AppHeader } from '@/components/AppHeader'
import { ConfigError } from '@/components/ConfigError'
import { FileTree } from '@/components/FileTree'
import { Viewer, type ViewerFile } from '@/components/Viewer'

export const dynamic = 'force-dynamic'

export default async function BrowsePage({ params }: { params: { slug?: string[] } }) {
  let title = DEFAULT_APP_TITLE
  try {
    title = getConfig().appTitle
  } catch (err) {
    return <ConfigError message={errorMessage(err)} />
  }

  // Kick off the tree listing and the selected file fetch together — they hit
  // the source independently, so awaiting them in series would add a round-trip.
  const path = (params.slug ?? []).join('/')
  const filesPromise = getSource().list()
  const filePromise = path ? loadFile(path) : Promise.resolve(null)

  let files
  try {
    files = await filesPromise
  } catch (err) {
    return <Shell title={title} sidebar={null}>
      <Notice tone="error" heading="Could not load files">
        {errorMessage(err)}
      </Notice>
    </Shell>
  }

  const file = await filePromise

  return (
    <Shell title={title} sidebar={<FileTree files={files} currentPath={path} />}>
      {file ? (
        <Viewer key={file.path} file={file} />
      ) : (
        <Notice tone="muted" heading="Select a file">
          Pick a file from the sidebar to view it. tsx, html, markdown and OpenAPI specs are
          rendered; everything else is shown as raw text.
        </Notice>
      )}
    </Shell>
  )
}

async function loadFile(path: string): Promise<ViewerFile> {
  const kind = renderKindOf(path)
  if (kind === 'image') {
    return { path, kind }
  }
  try {
    const { text, size } = await getSource().readText(path)
    // Code-like files are highlighted on the server so the client ships no
    // highlighter; markdown/html/tsx have their own renderers.
    const isCode = kind === 'raw' || kind === 'data'
    return {
      path,
      kind,
      content: text,
      size,
      isOpenApi: kind === 'data' && isOpenApiDocument(text),
      highlightedHtml: isCode ? await highlightCode(text, shikiLanguageOf(path)) : undefined,
    }
  } catch (err) {
    if (err instanceof FileTooLargeError) {
      return { path, kind: 'too-large', size: err.size }
    }
    if (err instanceof FileNotFoundError) {
      return { path, kind: 'not-found' }
    }
    return { path, kind: 'error', error: errorMessage(err) }
  }
}

// ─── Layout primitives ───────────────────────────────────────────────────────

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

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
