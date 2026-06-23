import { invoke } from '@tauri-apps/api/core'
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

/** Rust 쪽 ApiError 직렬화 형태 (lib.rs 의 command 가 reject 할 때 넘어온다). */
interface ApiError {
  code: string
  message: string
}

/**
 * 로컬 파일시스템 소스. 실제 디렉터리 순회·경로 봉쇄·바이트 읽기는 모두 Rust
 * (`src-tauri/src/local.rs`) 에서 수행하고, 여기서는 Tauri `invoke` 로 위임만 한다.
 * 경로 이탈(`..`/절대경로/루트 밖 심볼릭링크) 거부도 Rust 가 담당한다.
 */
export class LocalSource implements Source {
  constructor(
    private readonly root: string,
    private readonly ttl: number,
    private readonly maxBytes: number,
  ) {}

  describe(): SourceInfo {
    return {
      label: '로컬 디렉터리',
      location: this.root,
      details: [],
    }
  }

  cacheKey(): string {
    return `local:${this.root}`
  }

  list(): Promise<TreeFile[]> {
    return cached(`local-tree:${this.root}`, this.ttl, () =>
      invoke<TreeFile[]>('list_dir', { root: this.root }),
    )
  }

  async readText(relPath: string): Promise<FileContent> {
    try {
      return await invoke<FileContent>('read_text', {
        root: this.root,
        rel: relPath,
        maxBytes: this.maxBytes,
      })
    } catch (err) {
      throw this.mapError(err, relPath)
    }
  }

  async readDataUrl(relPath: string): Promise<string> {
    try {
      const base64 = await invoke<string>('read_base64', { root: this.root, rel: relPath })
      return toDataUrl(relPath, base64)
    } catch (err) {
      throw this.mapError(err, relPath)
    }
  }

  /** Rust ApiError 를 프런트의 도메인 에러로 변환한다. */
  private mapError(err: unknown, relPath: string): Error {
    const api = err as Partial<ApiError> | null
    if (api && typeof api === 'object' && typeof api.code === 'string') {
      if (api.code === 'NotFound') return new FileNotFoundError(relPath)
      if (api.code === 'TooLarge') {
        return new FileTooLargeError(parseSize(api.message ?? ''), this.maxBytes)
      }
      return new Error(api.message ?? 'Unknown error')
    }
    return err instanceof Error ? err : new Error(String(err))
  }
}

/** "File is 12345 bytes, …" 메시지에서 첫 정수(바이트 크기)를 뽑아낸다. */
function parseSize(message: string): number {
  const match = message.match(/\d+/)
  return match ? Number(match[0]) : 0
}
