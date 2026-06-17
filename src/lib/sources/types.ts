/** Shared contracts for pluggable file sources (GitHub, local filesystem, …). */

/** A single file entry in a source tree (directories are derived client-side). */
export interface TreeFile {
  /** Path relative to the source root, e.g. "specs/petstore.yaml". */
  path: string
  size: number
}

export interface FileContent {
  /** Decoded UTF-8 text. */
  text: string
  size: number
}

/** One key/value row shown on the settings page. */
export interface SourceDetail {
  label: string
  value: string
}

/** Human-facing summary of the active source, shown on the settings page. */
export interface SourceInfo {
  /** Display name of the backend, e.g. "GitHub". */
  label: string
  /** Where the source points, e.g. "owner/name" or "/data". */
  location: string
  /** Extra backend-specific rows (branch, root, token hint, …). */
  details: SourceDetail[]
}

/**
 * A file source the viewer reads from. Each implementation owns how files are
 * fetched and how requested paths are kept within the configured root.
 * Everything above this interface — the browse page, /api/raw, the renderers —
 * depends only on these four methods and never on a concrete backend.
 */
export interface Source {
  /** Static description for the settings page; performs no I/O. */
  describe(): SourceInfo
  list(): Promise<TreeFile[]>
  readText(relPath: string): Promise<FileContent>
  readBytes(relPath: string): Promise<Buffer>
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
