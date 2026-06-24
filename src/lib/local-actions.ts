import { invoke } from '@tauri-apps/api/core'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import type { MenuItem } from '@/components/ContextMenu'

// 로컬 소스에서만 의미가 있는 파일 동작(경로 복사, 파일 관리자에서 보기).
// 절대 경로는 루트 + 상대경로로 만든다.

function absolutePath(root: string, rel: string): string {
  return `${root.replace(/\/+$/, '')}/${rel}`
}

/** 파일의 절대 경로를 클립보드에 복사한다. */
export async function copyFilePath(root: string, rel: string): Promise<void> {
  await writeText(absolutePath(root, rel))
}

/** 파일을 Finder(파일 관리자)에서 선택한 채로 연다. */
export async function revealInFinder(root: string, rel: string): Promise<void> {
  await invoke('reveal_path', { root, rel })
}

/** 로컬 파일 우클릭 메뉴 항목(경로 복사 · Finder에서 보기). FileTree·Viewer 공용. */
export function localFileMenuItems(root: string, rel: string): MenuItem[] {
  return [
    { label: '경로 복사', onSelect: () => void copyFilePath(root, rel) },
    { label: 'Finder에서 보기', onSelect: () => void revealInFinder(root, rel) },
  ]
}
