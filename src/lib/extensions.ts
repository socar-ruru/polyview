import yaml from 'js-yaml'

/** How the viewer should render a given file. */
export type RenderKind = 'markdown' | 'html' | 'tsx' | 'data' | 'image' | 'raw'

const EXT_TO_KIND: Record<string, RenderKind> = {
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  tsx: 'tsx',
  yaml: 'data',
  yml: 'data',
  json: 'data',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  avif: 'image',
}

export function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.')
  if (dot === -1 || dot === path.length - 1) return ''
  return path.slice(dot + 1).toLowerCase()
}

/** Anything we do not explicitly know how to render falls back to raw text. */
export function renderKindOf(path: string): RenderKind {
  return EXT_TO_KIND[extensionOf(path)] ?? 'raw'
}

// Maps file extensions to highlight.js language names. Values must match a
// language registered in `highlight-client.ts` (e.g. tsx → typescript) so the
// renderer can highlight directly instead of falling back to auto-detection.
const HIGHLIGHT_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  css: 'css',
  scss: 'scss',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  sh: 'bash',
  bash: 'bash',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  sql: 'sql',
  md: 'markdown',
  markdown: 'markdown',
  toml: 'ini',
}

/** Language hint for raw syntax highlighting, or undefined to auto-detect. */
export function highlightLanguageOf(path: string): string | undefined {
  return HIGHLIGHT_LANG[extensionOf(path)]
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
}

/** Content-Type for serving a file's raw bytes; defaults to octet-stream. */
export function rawContentTypeOf(path: string): string {
  return IMAGE_MIME_TYPES[extensionOf(path)] ?? 'application/octet-stream'
}

/**
 * Returns true when a yaml/json document looks like an OpenAPI / Swagger spec,
 * which is the only case where the viewer offers the "OpenAPI" tab. Parsing
 * failures and non-spec documents simply fall back to raw-only.
 */
export function isOpenApiDocument(text: string): boolean {
  try {
    const doc = yaml.load(text) as Record<string, unknown> | null
    if (!doc || typeof doc !== 'object') return false
    const openapi = doc.openapi
    if (typeof openapi === 'string' && openapi.startsWith('3')) return true
    if (doc.swagger === '2.0') return true
    return false
  } catch {
    return false
  }
}
