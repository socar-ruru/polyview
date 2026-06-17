import type { Source } from './types'
import { getConfig } from '@/lib/config'
import { GitHubSource } from './github'
import { LocalSource } from './local'

export type { Source, TreeFile, FileContent, SourceInfo, SourceDetail } from './types'
export { FileNotFoundError, FileTooLargeError } from './types'

let cachedSource: Source | null = null

/** Returns the configured file source, instantiated once per process. */
export function getSource(): Source {
  if (cachedSource) return cachedSource
  const cfg = getConfig()
  cachedSource =
    cfg.sourceType === 'local'
      ? new LocalSource(cfg.local.root, cfg.cacheTtlSeconds, cfg.maxFileBytes)
      : new GitHubSource(cfg.github, cfg.cacheTtlSeconds, cfg.maxFileBytes)
  return cachedSource
}
