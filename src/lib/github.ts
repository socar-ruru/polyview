import { getConfig } from '@/lib/config'
import { cached } from '@/lib/cache'

/** A single file entry in the repository tree (directories are derived client-side). */
export interface TreeFile {
  /** Path relative to the configured base path, e.g. "specs/petstore.yaml". */
  path: string
  size: number
}

export interface FileContent {
  /** Decoded UTF-8 text. */
  text: string
  size: number
}

const API = 'https://api.github.com'

/** Lists every file in the repo (recursively), scoped to the configured base path. */
export async function listFiles(): Promise<TreeFile[]> {
  const cfg = getConfig()
  return cached(`tree:${cfg.repoOwner}/${cfg.repoName}@${cfg.branch}`, cfg.cacheTtlSeconds, async () => {
    const url = `${API}/repos/${cfg.repoOwner}/${cfg.repoName}/git/trees/${encodeURIComponent(cfg.branch)}?recursive=1`
    const res = await ghFetch(url)
    if (!res.ok) {
      throw new Error(`Failed to list repository tree (${res.status}): ${await safeText(res)}`)
    }
    const body = (await res.json()) as {
      truncated?: boolean
      tree: Array<{ path: string; type: string; size?: number }>
    }

    const prefix = cfg.basePath ? `${cfg.basePath}/` : ''
    const files = body.tree
      .filter((n) => n.type === 'blob')
      .filter((n) => (prefix ? n.path.startsWith(prefix) : true))
      .map((n) => ({ path: prefix ? n.path.slice(prefix.length) : n.path, size: n.size ?? 0 }))
      .sort((a, b) => a.path.localeCompare(b.path))

    return files
  })
}

/** Fetches a single file as UTF-8 text, enforcing the configured size limit. */
export async function getFileText(relPath: string): Promise<FileContent> {
  const cfg = getConfig()
  const res = await fetchRaw(relPath)
  // Cheap early-out using the advertised Content-Length to avoid buffering a
  // large body, then re-check the actual bytes since the header can be missing
  // or wrong.
  const size = Number(res.headers.get('content-length') ?? '0')
  if (size > cfg.maxFileBytes) {
    throw new FileTooLargeError(size, cfg.maxFileBytes)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.byteLength > cfg.maxFileBytes) {
    throw new FileTooLargeError(buf.byteLength, cfg.maxFileBytes)
  }
  return { text: buf.toString('utf8'), size: buf.byteLength }
}

/** Fetches a single file as raw bytes (used for images and iframe sources). */
export async function getFileBytes(relPath: string): Promise<Buffer> {
  const res = await fetchRaw(relPath)
  return Buffer.from(await res.arrayBuffer())
}

async function fetchRaw(relPath: string): Promise<Response> {
  const cfg = getConfig()
  const full = resolveWithinRoot(cfg.basePath, relPath)
  const url = `${API}/repos/${cfg.repoOwner}/${cfg.repoName}/contents/${encodePath(full)}?ref=${encodeURIComponent(cfg.branch)}`
  const res = await ghFetch(url, { Accept: 'application/vnd.github.raw+json' })
  if (res.status === 404) throw new FileNotFoundError(relPath)
  if (!res.ok) {
    throw new Error(`Failed to fetch "${relPath}" (${res.status}): ${await safeText(res)}`)
  }
  return res
}

function ghFetch(url: string, extraHeaders: Record<string, string> = {}): Promise<Response> {
  const cfg = getConfig()
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'polyview',
      ...extraHeaders,
    },
    // GitHub data is mirrored on demand; our own TTL cache controls freshness.
    cache: 'no-store',
  })
}

/**
 * Resolves a viewer-relative path onto the configured root (base path) and
 * guarantees the result stays within that root. Segments are normalised
 * (`.` dropped, `..` popped) and any path that would climb above the root — via
 * `..`, a leading slash, or encoded equivalents — is rejected as not-found.
 *
 * This is the single chokepoint every file fetch (browse page and /api/raw) goes
 * through, so files outside the configured root cannot be read even with a
 * hand-crafted request, regardless of what the listing exposes.
 */
function resolveWithinRoot(base: string, relPath: string): string {
  const stack: string[] = []
  for (const segment of relPath.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (stack.length === 0) throw new FileNotFoundError(relPath)
      stack.pop()
      continue
    }
    stack.push(segment)
  }
  if (stack.length === 0) throw new FileNotFoundError(relPath)
  return [base, ...stack].filter(Boolean).join('/')
}

/** Encodes each path segment but keeps the slashes between them. */
function encodePath(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/')
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300)
  } catch {
    return ''
  }
}

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundError'
  }
}

export class FileTooLargeError extends Error {
  constructor(
    readonly size: number,
    readonly limit: number,
  ) {
    super(`File is ${size} bytes, which exceeds the ${limit} byte limit`)
    this.name = 'FileTooLargeError'
  }
}
