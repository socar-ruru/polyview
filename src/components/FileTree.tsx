'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { TreeFile } from '@/lib/sources'
import { basename } from '@/lib/paths'

interface DirNode {
  name: string
  path: string
  /** Child directories, pre-sorted by name. */
  dirs: DirNode[]
  files: TreeFile[]
}

export function FileTree({ files, currentPath }: { files: TreeFile[]; currentPath: string }) {
  const [query, setQuery] = useState('')
  const root = useMemo(() => buildTree(files), [files])

  const trimmed = query.trim().toLowerCase()
  const matches = trimmed
    ? files.filter((f) => f.path.toLowerCase().includes(trimmed))
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter files…"
          className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
        />
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-1 pb-3 text-sm">
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
    return <p className="px-3 py-2 text-xs text-neutral-400">No matching files.</p>
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
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-neutral-700 hover:bg-neutral-200/60"
        style={{ paddingLeft: indent(depth) }}
      >
        <Chevron open={open} />
        <span className="truncate font-medium">{dir.name}</span>
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
      href={hrefFor(path)}
      className={`block truncate rounded px-2 py-1 ${
        active ? 'bg-blue-100 font-medium text-blue-800' : 'text-neutral-600 hover:bg-neutral-200/60'
      }`}
      style={{ paddingLeft: indent(depth) + 14 }}
      title={path}
    >
      {label}
    </Link>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3 w-3 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="currentColor"
    >
      <path d="M6 4l4 4-4 4V4z" />
    </svg>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

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

/** Freezes a built directory into its sorted, render-ready form. Files arrive
 * already globally sorted by path, so only the directories need ordering. */
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
  return 8 + depth * 12
}
