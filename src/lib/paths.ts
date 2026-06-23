/** Node 의존성 없는 경로 헬퍼. */

/** 슬래시 구분 경로의 마지막 조각, 예: "a/b/c.ts" → "c.ts". */
export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}
