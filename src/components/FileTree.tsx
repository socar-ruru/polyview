import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { TreeFile } from '@/lib/sources'
import { basename } from '@/lib/paths'
import { ChevronRightIcon, FileTypeIcon, FolderIcon, SearchIcon } from '@/components/icons'

interface DirNode {
  name: string
  path: string
  /** 이름순으로 미리 정렬된 자식 디렉터리 목록. */
  dirs: DirNode[]
  files: TreeFile[]
}

export function FileTree({
  files,
  currentPath,
  sourceLabel,
}: {
  files: TreeFile[]
  currentPath: string
  /** 사이드바 상단에 표시할 활성 소스 라벨(예: "Local · docs"). */
  sourceLabel?: string
}) {
  const [query, setQuery] = useState('')
  const root = useMemo(() => buildTree(files), [files])

  const trimmed = query.trim().toLowerCase()
  const matches = trimmed
    ? files.filter((f) => f.path.toLowerCase().includes(trimmed))
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files…"
            className="w-full rounded-md border border-line bg-canvas py-1.5 pl-8 pr-2.5 text-xs text-fg outline-none focus:border-accent"
          />
        </div>
      </div>
      {sourceLabel && (
        <div className="shrink-0 truncate px-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted">
          {sourceLabel}
        </div>
      )}
      <nav className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3 text-sm">
        {matches ? (
          <FlatList files={matches} currentPath={currentPath} />
        ) : (
          <DirView node={root} currentPath={currentPath} depth={0} />
        )}
      </nav>
    </div>
  )
}

function FlatList({ files, currentPath }: { files: TreeFile[]; currentPath: string }) {
  if (files.length === 0) {
    return <p className="px-3 py-2 text-xs text-muted">No matching files.</p>
  }
  return (
    <ul>
      {files.map((f) => (
        <li key={f.path}>
          <FileLink path={f.path} label={f.path} active={f.path === currentPath} depth={0} />
        </li>
      ))}
    </ul>
  )
}

function DirView({
  node,
  currentPath,
  depth,
}: {
  node: DirNode
  currentPath: string
  depth: number
}) {
  return (
    <ul>
      {node.dirs.map((dir) => (
        <li key={dir.path}>
          <Folder dir={dir} currentPath={currentPath} depth={depth} />
        </li>
      ))}
      {node.files.map((f) => (
        <li key={f.path}>
          <FileLink path={f.path} label={basename(f.path)} active={f.path === currentPath} depth={depth} />
        </li>
      ))}
    </ul>
  )
}

function Folder({ dir, currentPath, depth }: { dir: DirNode; currentPath: string; depth: number }) {
  const containsCurrent = currentPath === dir.path || currentPath.startsWith(`${dir.path}/`)
  const [open, setOpen] = useState(containsCurrent)

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-fg hover:bg-hover/50"
        style={{ paddingLeft: indent(depth) }}
      >
        <ChevronRightIcon
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <FolderIcon className="h-4 w-4 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate font-medium">{dir.name}</span>
      </button>
      {open && <DirView node={dir} currentPath={currentPath} depth={depth + 1} />}
    </>
  )
}

function FileLink({
  path,
  label,
  active,
  depth,
}: {
  path: string
  label: string
  active: boolean
  depth: number
}) {
  return (
    <Link
      to={hrefFor(path)}
      className={`flex items-center gap-2 rounded-md py-1 pr-2 ${
        active
          ? 'bg-accent/12 font-medium text-accent'
          : 'text-muted hover:bg-hover/50 hover:text-fg'
      }`}
      style={{ paddingLeft: indent(depth) + FILE_INDENT_OFFSET }}
      title={path}
    >
      <FileTypeIcon path={path} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  )
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

interface MutableDir {
  name: string
  path: string
  dirs: Map<string, MutableDir>
  files: TreeFile[]
}

function buildTree(files: TreeFile[]): DirNode {
  const root: MutableDir = { name: '', path: '', dirs: new Map(), files: [] }
  for (const file of files) {
    const segments = file.path.split('/')
    let node = root
    for (let i = 0; i < segments.length - 1; i++) {
      const name = segments[i]
      const path = segments.slice(0, i + 1).join('/')
      let child = node.dirs.get(name)
      if (!child) {
        child = { name, path, dirs: new Map(), files: [] }
        node.dirs.set(name, child)
      }
      node = child
    }
    node.files.push(file)
  }
  return finalizeDir(root)
}

/** 구성 완료된 디렉터리를 정렬된 렌더 가능한 형태로 확정한다. 파일은 전역 경로순으로
 * 이미 정렬되어 있으므로 디렉터리만 순서를 맞추면 된다. */
function finalizeDir(node: MutableDir): DirNode {
  const dirs = [...node.dirs.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(finalizeDir)
  return { name: node.name, path: node.path, dirs, files: node.files }
}

function hrefFor(path: string): string {
  return `/browse/${path.split('/').map(encodeURIComponent).join('/')}`
}

function indent(depth: number): number {
  return 8 + depth * 14
}

// 파일 행 들여쓰기 보정: 폴더 행의 셰브론(아이콘 폭+간격 ≈ 20px) 자리만큼 더 밀어
// 파일명을 같은 깊이의 폴더명과 시각적으로 정렬한다.
const FILE_INDENT_OFFSET = 20
