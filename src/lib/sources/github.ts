import { cached } from '@/lib/cache'
import { toDataUrl } from '@/lib/extensions'
import {
  type Source,
  type TreeFile,
  type FileContent,
  type SourceInfo,
  FileNotFoundError,
  FileTooLargeError,
} from './types'

const API = 'https://api.github.com'

/** GitHub 소스를 만들기 위한 해석된 설정 (토큰은 OS 키체인에서 읽어온 실제 값). */
export interface GitHubConfig {
  token: string
  owner: string
  name: string
  branch: string
  /** 뷰어 루트로 취급할 하위 디렉터리. 앞뒤 슬래시는 제거된 형태. */
  basePath: string
}

/**
 * GitHub 저장소에서 REST API 를 통해 파일을 읽는다(목록은 Git Trees API,
 * 개별 파일은 Contents API 사용). 설정된 base path 범위 내로 한정된다.
 * 데스크탑 webview 의 fetch 로 직접 호출한다 (GitHub API 는 CORS 를 허용한다).
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

  cacheKey(): string {
    const gh = this.gh
    return `gh:${gh.owner}/${gh.name}@${gh.branch}:${gh.basePath}`
  }

  list(): Promise<TreeFile[]> {
    const gh = this.gh
    return cached(`tree:${gh.owner}/${gh.name}@${gh.branch}:${gh.basePath}`, this.ttl, async () => {
      const url = `${API}/repos/${gh.owner}/${gh.name}/git/trees/${encodeURIComponent(gh.branch)}?recursive=1`
      const res = await this.ghFetch(url)
      if (!res.ok) {
        throw new Error(`저장소 트리 조회 실패 (${res.status}): ${await safeText(res)}`)
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
    // Content-Length 로 우선 거르고, 헤더가 없거나 틀릴 수 있으니 실제 바이트로 재확인.
    const size = Number(res.headers.get('content-length') ?? '0')
    if (size > this.maxBytes) {
      throw new FileTooLargeError(size, this.maxBytes)
    }
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength > this.maxBytes) {
      throw new FileTooLargeError(bytes.byteLength, this.maxBytes)
    }
    return { text: new TextDecoder().decode(bytes), size: bytes.byteLength }
  }

  async readDataUrl(relPath: string): Promise<string> {
    const res = await this.fetchRaw(relPath)
    const bytes = new Uint8Array(await res.arrayBuffer())
    return toDataUrl(relPath, base64FromBytes(bytes))
  }

  private async fetchRaw(relPath: string): Promise<Response> {
    const gh = this.gh
    const full = resolveWithinRoot(gh.basePath, relPath)
    const url = `${API}/repos/${gh.owner}/${gh.name}/contents/${encodePath(full)}?ref=${encodeURIComponent(gh.branch)}`
    const res = await this.ghFetch(url, { Accept: 'application/vnd.github.raw+json' })
    if (res.status === 404) throw new FileNotFoundError(relPath)
    if (!res.ok) {
      throw new Error(`"${relPath}" 가져오기 실패 (${res.status}): ${await safeText(res)}`)
    }
    return res
  }

  private ghFetch(url: string, extraHeaders: Record<string, string> = {}): Promise<Response> {
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${this.gh.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...extraHeaders,
      },
      // GitHub 데이터는 온디맨드로 미러링되고, 신선도는 자체 TTL 캐시로 제어한다.
      cache: 'no-store',
    })
  }
}

/**
 * 뷰어 상대 경로를 설정된 루트(base path) 위로 해석하고, 결과가 반드시 그 루트
 * 안에 머물도록 보장한다. `..`, 선행 슬래시, 인코딩된 동치가 루트 밖으로
 * 나가려 하면 not-found 로 거부한다.
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

/** 브라우저의 btoa 를 사용해 raw 바이트를 base64 로 인코딩한다. 인자 한도를 피하기 위해 청크 단위로 처리한다. */
function base64FromBytes(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** 각 경로 세그먼트를 인코딩하되 세그먼트 사이의 슬래시는 유지한다. */
function encodePath(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/')
}

/** 토큰의 비밀이 아닌 접두사만 표시하고 실제 값은 마스킹한다. */
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
