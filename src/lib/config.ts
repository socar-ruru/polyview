/**
 * Runtime configuration, read once from environment variables.
 *
 * Everything the app needs to run is supplied via env so the Docker image can
 * be deployed as-is. Required values are validated lazily on first access so a
 * misconfigured deployment fails with a clear message instead of a vague crash.
 */

import { DEFAULT_APP_TITLE } from '@/lib/constants'

export interface AppConfig {
  githubToken: string
  repoOwner: string
  repoName: string
  branch: string
  /** Sub-directory treated as the viewer root, normalised without slashes. */
  basePath: string
  appTitle: string
  cacheTtlSeconds: number
  maxFileBytes: number
  basicAuth: { user: string; password: string } | null
}

let cached: AppConfig | null = null

export function getConfig(): AppConfig {
  if (cached) return cached

  const token = required('GITHUB_TOKEN')
  const repo = required('GITHUB_REPO')
  const [owner, name] = repo.split('/')
  if (!owner || !name) {
    throw new Error(`GITHUB_REPO must be in "owner/name" form, got "${repo}"`)
  }

  const user = process.env.BASIC_AUTH_USER?.trim()
  const password = process.env.BASIC_AUTH_PASSWORD?.trim()

  cached = {
    githubToken: token,
    repoOwner: owner,
    repoName: name,
    branch: process.env.GITHUB_BRANCH?.trim() || 'main',
    basePath: stripSlashes(process.env.GITHUB_BASE_PATH || ''),
    appTitle: process.env.APP_TITLE?.trim() || DEFAULT_APP_TITLE,
    cacheTtlSeconds: positiveInt(process.env.CACHE_TTL, 60),
    maxFileBytes: positiveInt(process.env.MAX_FILE_BYTES, 2 * 1024 * 1024),
    basicAuth: user && password ? { user, password } : null,
  }
  return cached
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
