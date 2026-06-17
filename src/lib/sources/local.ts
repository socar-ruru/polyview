import { promises as fs, realpathSync } from 'node:fs'
import { join, relative, resolve, isAbsolute, sep, posix } from 'node:path'
import { cached } from '@/lib/cache'
import {
  type Source,
  type TreeFile,
  type FileContent,
  type SourceInfo,
  FileNotFoundError,
  FileTooLargeError,
} from './types'

/** Directories never worth listing in a file viewer. */
const SKIP_DIRS = new Set(['.git', 'node_modules'])
const SKIP_FILES = new Set(['.DS_Store'])

/**
 * Reads files from a directory on the local filesystem (e.g. a mounted Docker
 * volume). Every requested path is resolved against the root and rejected if it
 * escapes — via `..`, an absolute path, or a symlink pointing outside the root.
 * Symlinks are also skipped while listing, so the tree only ever shows files
 * that physically live under the root.
 */
export class LocalSource implements Source {
  private readonly root: string

  constructor(
    root: string,
    private readonly ttl: number,
    private readonly maxBytes: number,
  ) {
    // Resolve the root through symlinks once so containment checks compare
    // real paths against a real root. Fall back to the literal path if it does
    // not exist yet (listing simply returns empty until it appears).
    this.root = safeRealpath(resolve(root))
  }

  describe(): SourceInfo {
    return {
      label: 'Local filesystem',
      location: this.root,
      details: [],
    }
  }

  list(): Promise<TreeFile[]> {
    return cached(`local-tree:${this.root}`, this.ttl, async () => {
      const files: TreeFile[] = []
      await this.walk(this.root, files)
      return files.sort((a, b) => a.path.localeCompare(b.path))
    })
  }

  async readText(relPath: string): Promise<FileContent> {
    const abs = await this.resolveSafe(relPath)
    const size = await this.fileSize(abs)
    if (size > this.maxBytes) throw new FileTooLargeError(size, this.maxBytes)
    const buf = await fs.readFile(abs)
    return { text: buf.toString('utf8'), size: buf.byteLength }
  }

  async readBytes(relPath: string): Promise<Buffer> {
    const abs = await this.resolveSafe(relPath)
    await this.fileSize(abs) // ensure it exists and is a regular file
    return fs.readFile(abs)
  }

  private async walk(dir: string, out: TreeFile[]): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return // unreadable directory (or missing root) → nothing to list
    }
    for (const entry of entries) {
      // isDirectory()/isFile() are false for symlinks, so symlinks are skipped.
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await this.walk(join(dir, entry.name), out)
      } else if (entry.isFile()) {
        if (SKIP_FILES.has(entry.name)) continue
        const abs = join(dir, entry.name)
        try {
          out.push({ path: toPosixRel(this.root, abs), size: (await fs.stat(abs)).size })
        } catch {
          // file vanished between readdir and stat — skip it
        }
      }
    }
  }

  private async fileSize(abs: string): Promise<number> {
    try {
      const st = await fs.stat(abs)
      if (!st.isFile()) throw new FileNotFoundError(abs)
      return st.size
    } catch (err) {
      if (err instanceof FileNotFoundError) throw err
      throw new FileNotFoundError(abs)
    }
  }

  /** Resolves a viewer-relative path within the root, rejecting any escape. */
  private async resolveSafe(relPath: string): Promise<string> {
    const abs = resolve(this.root, relPath)
    if (!isWithin(this.root, abs)) throw new FileNotFoundError(relPath)
    let real: string
    try {
      real = await fs.realpath(abs)
    } catch {
      throw new FileNotFoundError(relPath)
    }
    // A symlink under the root could still point outside it — re-check the
    // resolved real path.
    if (!isWithin(this.root, real)) throw new FileNotFoundError(relPath)
    // Skipped paths are hidden from the listing AND unreadable, so hiding is a
    // real boundary (e.g. .git, which can leak remote URLs/credentials) rather
    // than security-by-obscurity.
    if (isSkipped(relative(this.root, real))) throw new FileNotFoundError(relPath)
    return real
  }
}

/** True when a root-relative path lives under a skipped dir or is a skipped file. */
function isSkipped(rel: string): boolean {
  const segments = rel.split(sep)
  if (SKIP_FILES.has(segments[segments.length - 1])) return true
  return segments.some((s) => SKIP_DIRS.has(s))
}

/** True when `target` is a path strictly inside `root` (not the root itself). */
function isWithin(root: string, target: string): boolean {
  if (target === root) return false
  const rel = relative(root, target)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/** Root-relative path using forward slashes, matching the GitHub source. */
function toPosixRel(root: string, abs: string): string {
  return relative(root, abs).split(sep).join(posix.sep)
}

function safeRealpath(p: string): string {
  try {
    return realpathSync(p)
  } catch {
    return p
  }
}
