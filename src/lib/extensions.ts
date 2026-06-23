import yaml from 'js-yaml'

/** 뷰어가 특정 파일을 어떤 방식으로 렌더링할지. */
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

/** 명시적으로 렌더링 방법을 아는 게 아니면 모두 원본 텍스트로 폴백한다. */
export function renderKindOf(path: string): RenderKind {
  return EXT_TO_KIND[extensionOf(path)] ?? 'raw'
}

// 파일 확장자를 Shiki 언어 ID 로 매핑한다. 값은 `highlight.ts` 에 등록된 문법과
// 일치해야 하며, 매핑되지 않은 확장자는 일반 텍스트로 렌더된다.
const SHIKI_LANG: Record<string, string> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  css: 'css',
  scss: 'scss',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  sql: 'sql',
  md: 'markdown',
  markdown: 'markdown',
  toml: 'toml',
  ini: 'ini',
}

/** 경로에 대응하는 Shiki 언어 ID. 없으면(undefined) 일반 텍스트로 렌더. */
export function shikiLanguageOf(path: string): string | undefined {
  return SHIKI_LANG[extensionOf(path)]
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

/** 파일 원본 바이트의 Content-Type(data URL 용). 기본값은 octet-stream. */
export function rawContentTypeOf(path: string): string {
  return IMAGE_MIME_TYPES[extensionOf(path)] ?? 'application/octet-stream'
}

/** base64 로 인코딩된 파일 바이트를 경로 기반 MIME 타입의 data URL 로 조립한다. */
export function toDataUrl(path: string, base64: string): string {
  return `data:${rawContentTypeOf(path)};base64,${base64}`
}

/**
 * yaml/json 문서가 OpenAPI / Swagger 스펙처럼 보이면 true 를 돌려준다. 뷰어가
 * "OpenAPI" 뷰를 제공하는 유일한 경우다. 파싱 실패나 스펙이 아닌 문서는 그냥
 * 원본 표시로 폴백한다.
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
