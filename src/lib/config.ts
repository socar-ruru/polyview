/**
 * Runtime configuration, read once from environment variables.
 *
 * Everything the app needs to run is supplied via env so the Docker image can
 * be deployed as-is. Required values are validated lazily on first access so a
 * misconfigured deployment fails with a clear message instead of a vague crash.
 */

import { resolve as resolvePath } from 'node:path'
import { DEFAULT_APP_TITLE } from '@/lib/constants'

export type SourceType = 'github' | 'local'

export interface GitHubConfig {
  token: string
  owner: string
  name: string
  branch: string
  /** Sub-directory treated as the viewer root, normalised without slashes. */
  basePath: string
}

export interface LocalConfig {
  /** Absolute path to the directory served as the viewer root. */
  root: string
}

interface BaseConfig {
  appTitle: string
  cacheTtlSeconds: number
  maxFileBytes: number
  basicAuth: { user: string; password: string } | null
}

/** Discriminated on sourceType so the matching source config is always present. */
export type AppConfig =
  | (BaseConfig & { sourceType: 'github'; github: GitHubConfig })
  | (BaseConfig & { sourceType: 'local'; local: LocalConfig })

let cached: AppConfig | null = null

export function getConfig(): AppConfig {
  if (cached) return cached

  const user = process.env.BASIC_AUTH_USER?.trim()
  const password = process.env.BASIC_AUTH_PASSWORD?.trim()
  const base: BaseConfig = {
    appTitle: process.env.APP_TITLE?.trim() || DEFAULT_APP_TITLE,
    cacheTtlSeconds: positiveInt(process.env.CACHE_TTL, 60),
    maxFileBytes: positiveInt(process.env.MAX_FILE_BYTES, 2 * 1024 * 1024),
    basicAuth: user && password ? { user, password } : null,
  }

  cached =
    resolveSourceType() === 'github'
      ? { ...base, sourceType: 'github', github: readGitHubConfig() }
      : { ...base, sourceType: 'local', local: readLocalConfig() }
  return cached
}

/** Picks the backend from SOURCE_TYPE, inferring from GitHub vars for back-compat. */
function resolveSourceType(): SourceType {
  const explicit = process.env.SOURCE_TYPE?.trim().toLowerCase()
  if (explicit === 'github' || explicit === 'local') return explicit
  if (explicit) {
    throw new Error(`SOURCE_TYPE must be "github" or "local", got "${explicit}"`)
  }
  // Backward compatibility with GitHub-only deployments that predate SOURCE_TYPE.
  if (process.env.GITHUB_REPO?.trim()) return 'github'
  if (process.env.LOCAL_ROOT?.trim()) return 'local'
  throw new Error(
    'No source configured. Set SOURCE_TYPE=github with GITHUB_TOKEN/GITHUB_REPO, ' +
      'or SOURCE_TYPE=local with LOCAL_ROOT.',
  )
}

function readGitHubConfig(): GitHubConfig {
  const token = required('GITHUB_TOKEN')
  const repo = required('GITHUB_REPO')
  const [owner, name] = repo.split('/')
  if (!owner || !name) {
    throw new Error(`GITHUB_REPO must be in "owner/name" form, got "${repo}"`)
  }
  return {
    token,
    owner,
    name,
    branch: process.env.GITHUB_BRANCH?.trim() || 'main',
    basePath: stripSlashes(process.env.GITHUB_BASE_PATH || ''),
  }
}

function readLocalConfig(): LocalConfig {
  return { root: resolvePath(required('LOCAL_ROOT')) }
}

function required(key: string): string {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function stripSlashes(p: string): string {
  return p.replace(/^\/+|\/+$/g, '')
}
