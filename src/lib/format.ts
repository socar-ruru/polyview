/** 바이트 수를 짧고 읽기 쉬운 문자열(B / KB / MB)로 포맷한다. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** 알 수 없는 throw 값을 사람이 읽을 메시지 문자열로 변환한다. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
