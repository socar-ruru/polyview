import type { SVGProps } from 'react'
import { renderKindOf, type RenderKind } from '@/lib/extensions'

// 공용 SVG 아이콘. 크기는 호출부에서 className(h-4 w-4 등)으로 정하고, 색은
// currentColor 를 상속한다(부모의 text-* 색을 따른다).
const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7a1.5 1.5 0 0 1 1.5-1.5h3.3a1.5 1.5 0 0 1 1.06.44L10.5 7.5h9A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
    </svg>
  )
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

// ─── 파일 타입 아이콘 ─────────────────────────────────────────────────────────

function DocTextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M13 3.5V8a1 1 0 0 0 1 1h4" />
      <path d="M8.5 13h7M8.5 16.5h5" />
    </svg>
  )
}

function BracesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4a2.5 2.5 0 0 0-2.5 2.5v2A2.5 2.5 0 0 1 4 11a2.5 2.5 0 0 1 2.5 2.5v2A2.5 2.5 0 0 0 9 18" />
      <path d="M15 4a2.5 2.5 0 0 1 2.5 2.5v2A2.5 2.5 0 0 0 20 11a2.5 2.5 0 0 0-2.5 2.5v2A2.5 2.5 0 0 1 15 18" />
    </svg>
  )
}

function CodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 8l-4 4 4 4" />
      <path d="M15 8l4 4-4 4" />
    </svg>
  )
}

function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M5 18l4.5-4.5a1.5 1.5 0 0 1 2 0L17 19" />
    </svg>
  )
}

function FileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M13 3.5V8a1 1 0 0 0 1 1h4" />
    </svg>
  )
}

const KIND_ICON: Record<RenderKind, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  markdown: DocTextIcon,
  data: BracesIcon,
  html: CodeIcon,
  tsx: CodeIcon,
  raw: CodeIcon,
  image: ImageIcon,
}

/** 경로 확장자로 추정한 렌더 종류에 맞는 파일 타입 아이콘. */
export function FileTypeIcon({ path, className }: { path: string; className?: string }) {
  const Icon = KIND_ICON[renderKindOf(path)] ?? FileIcon
  return <Icon className={className} aria-hidden="true" />
}
