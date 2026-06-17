import type { GitHubConfig } from '@/lib/config'
import { cached } from '@/lib/cache'
import {
  type Source,
  type TreeFile,
  type FileContent,
  type SourceInfo,
  FileNotFoundError,
  FileTooLargeError,
} from './types'

const API = 'https://api.github.com'

/**
 * Reads files from a GitHub repository over the REST API (Git Trees for the
 * listing, Contents for individual files), scoped to a configured base path.
 * The compile/render layers above only see the {@link Source} interface.
 */
export class GitHubSource implements Source {
  constructor(
    private readonly gh: GitHubConfig,
    private readonly ttl: number,
    private readonly maxBytes: number,
  ) {}

  describe(): SourceInfo {
    return {
      label: 'GitHub',
      location: `${this.gh.owner}/${this.gh.name}`,
      details: [
        { label: 'Branch', value: this.gh.branch },
        { label: 'Root', value: this.gh.basePath || '(repo 전체)' },
        { label: 'Token', value: maskToken(this.gh.token) },
      ],
    }
  }

  list(): Promise<TreeFile[]> {
    const gh = this.gh
    return cached(`tree:${gh.owner}/${gh.name}@${gh.branch}`, this.ttl, async () => {
      const url = `${API}/repos/${gh.owner}/${gh.name}/git/trees/${encodeURIComponent(gh.branch)}?recursive=1`
      const res = await this.ghFetch(url)
      if (!res.ok) {
        throw new Error(`Failed to list repository tree (${res.status}): ${await safeText(res)}`)
      }
      const body = (await res.json()) as {
        truncated?: boolean
        tree: Array<{ path: string; type: string; size?: number }>
      }

      const prefix = gh.basePath ? `${gh.basePath}/` : ''
      return body.tree
        .filter((n) => n.type === 'blob' && (!prefix || n.path.startsWith(prefix)))
        .map((n) => ({ path: prefix ? n.path.slice(prefix.length) : n.path, size: n.size ?? 0 }))
        .sort((a, b) => a.path.localeCompare(b.path))
    })
  }

  async readText(relPath: string): Promise<FileContent> {
    const res = await this.fetchRaw(relPath)
    // Cheap early-out using the advertised Content-Length to avoid buffering a
    // large body, then re-check the actual bytes since the header can be missing
    // or wrong.
    const size = Number(res.headers.get('content-length') ?? '0')
    if (size > this.maxBytes) {
      throw new FileTooLargeError(size, this.maxBytes)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > this.maxBytes) {
      throw new FileTooLargeError(buf.byteLength, this.maxBytes)
    }
    return { text: buf.toString('utf8'), size: buf.byteLength }
  }

  async readBytes(relPath: string): Promise<Buffer> {
    const res = await this.fetchRaw(relPath)
    return Buffer.from(await res.arrayBuffer())
  }

  private async fetchRaw(relPath: string): Promise<Response> {
    const gh = this.gh
    const full = resolveWithinRoot(gh.basePath, relPath)
    const url = `${API}/repos/${gh.owner}/${gh.name}/contents/${encodePath(full)}?ref=${encodeURIComponent(gh.branch)}`
    const res = await this.ghFetch(url, { Accept: 'application/vnd.github.raw+json' })
    if (res.status === 404) throw new FileNotFoundError(relPath)
    if (!res.ok) {
      throw new Error(`Failed to fetch "${relPath}" (${res.status}): ${await safeText(res)}`)
    }
    return res
  }

  private ghFetch(url: string, extraHeaders: Record<string, string> = {}): Promise<Response> {
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${this.gh.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'polyview',
        ...extraHeaders,
      },
      // GitHub data is mirrored on demand; our own TTL cache controls freshness.
      cache: 'no-store',
    })
  }
}

/**
 * Resolves a viewer-relative path onto the configured root (base path) and
 * guarantees the result stays within that root. Segments are normalised
 * (`.` dropped, `..` popped) and any path that would climb above the root — via
 * `..`, a leading slash, or encoded equivalents — is rejected as not-found.
 *
 * This is the single chokepoint every file fetch goes through, so files outside
 * the configured root cannot be read even with a hand-crafted request.
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

/** Shows a token's non-secret prefix only, masking the actual value. */
function maskToken(token: string): string {
  const prefix = token.match(/^(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)/)?.[1]
  return prefix ? `${prefix}••••` : '설정됨 (••••)'
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300)
  } catch {
    return ''
  }
}
