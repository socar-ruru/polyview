import { invoke } from '@tauri-apps/api/core'
import { DEFAULT_APP_TITLE } from '@/lib/constants'
import type { Source } from '@/lib/sources/types'
import { GitHubSource } from '@/lib/sources/github'
import { LocalSource } from '@/lib/sources/local'

/**
 * 앱 설정. 비밀이 아닌 값은 그대로 settings.json(앱 config 디렉터리)에 저장하고,
 * GitHub 토큰만 OS 키체인에 따로 보관한다. 이 타입이 곧 settings.json 의 스키마다.
 */
export type SourceType = 'github' | 'local'

export interface LocalSettings {
  /** 뷰어 루트로 사용할 절대 경로. */
  root: string
}

export interface GitHubSettings {
  /** "owner/name" 형식. */
  repo: string
  branch: string
  /** 뷰어 루트로 취급할 하위 디렉터리(앞뒤 슬래시 제거). */
  basePath: string
}

export interface AppSettings {
  sourceType: SourceType
  local: LocalSettings
  github: GitHubSettings
  appTitle: string
  /** 미리보기를 시도하는 최대 파일 크기(바이트). */
  maxFileBytes: number
  /** 트리/파일 캐시 TTL(초). */
  cacheTtlSeconds: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  sourceType: 'local',
  local: { root: '' },
  github: { repo: '', branch: 'main', basePath: '' },
  appTitle: DEFAULT_APP_TITLE,
  maxFileBytes: 2 * 1024 * 1024,
  cacheTtlSeconds: 60,
}

/** 저장된 설정을 읽어 기본값과 병합한다. 아직 저장된 게 없으면 기본값을 돌려준다. */
export async function loadSettings(): Promise<AppSettings> {
  const raw = await invoke<unknown>('get_settings')
  return mergeSettings(raw)
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await invoke('set_settings', { value: settings })
}

/** 키체인에 저장된 GitHub 토큰. 없으면 null. */
export async function loadToken(): Promise<string | null> {
  return (await invoke<string | null>('get_github_token')) ?? null
}

export async function hasToken(): Promise<boolean> {
  return invoke<boolean>('has_github_token')
}

/** 토큰을 저장하거나(값 전달), 비우거나(null/빈 문자열) 한다. */
export async function saveToken(token: string | null): Promise<void> {
  await invoke('set_github_token', { token: token && token.trim() ? token.trim() : null })
}

/**
 * 현재 설정과 토큰으로 활성 소스를 만든다. 설정이 불완전하면(루트 미지정,
 * repo 형식 오류, 토큰 없음 등) 에러 메시지를 돌려주어 안내 화면을 띄우게 한다.
 */
export function createSource(
  settings: AppSettings,
  token: string | null,
): { source: Source } | { error: string } {
  if (settings.sourceType === 'local') {
    const root = settings.local.root.trim()
    if (!root) return { error: '로컬 디렉터리가 설정되지 않았습니다. 설정에서 폴더를 선택하세요.' }
    return { source: new LocalSource(root, settings.cacheTtlSeconds, settings.maxFileBytes) }
  }

  const repo = settings.github.repo.trim()
  const [owner, name] = repo.split('/')
  if (!owner || !name) {
    return { error: 'GitHub 저장소는 "owner/name" 형식이어야 합니다. 설정에서 입력하세요.' }
  }
  if (!token) {
    return { error: 'GitHub 토큰이 설정되지 않았습니다. 설정에서 Personal Access Token 을 입력하세요.' }
  }
  return {
    source: new GitHubSource(
      {
        token,
        owner,
        name,
        branch: settings.github.branch.trim() || 'main',
        basePath: stripSlashes(settings.github.basePath),
      },
      settings.cacheTtlSeconds,
      settings.maxFileBytes,
    ),
  }
}

/** 저장된(혹은 부분적인) JSON 을 기본값 위에 안전하게 덮어쓴다. */
function mergeSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
  const r = raw as Record<string, unknown>
  const local = (r.local as Record<string, unknown>) ?? {}
  const github = (r.github as Record<string, unknown>) ?? {}
  return {
    sourceType: r.sourceType === 'github' ? 'github' : 'local',
    local: {
      root: typeof local.root === 'string' ? local.root : DEFAULT_SETTINGS.local.root,
    },
    github: {
      repo: typeof github.repo === 'string' ? github.repo : DEFAULT_SETTINGS.github.repo,
      branch: typeof github.branch === 'string' ? github.branch : DEFAULT_SETTINGS.github.branch,
      basePath:
        typeof github.basePath === 'string' ? github.basePath : DEFAULT_SETTINGS.github.basePath,
    },
    appTitle: typeof r.appTitle === 'string' && r.appTitle.trim() ? r.appTitle : DEFAULT_APP_TITLE,
    maxFileBytes: positiveInt(r.maxFileBytes, DEFAULT_SETTINGS.maxFileBytes),
    cacheTtlSeconds: positiveInt(r.cacheTtlSeconds, DEFAULT_SETTINGS.cacheTtlSeconds),
  }
}

function positiveInt(raw: unknown, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function stripSlashes(p: string): string {
  return p.replace(/^\/+|\/+$/g, '')
}
