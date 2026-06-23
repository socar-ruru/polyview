/** 한 프로세스 안에서 공유되는 작은 인메모리 TTL 캐시. */

interface Entry<T> {
  value: Promise<T>
  expiresAt: number
}

const store = new Map<string, Entry<unknown>>()

export function cached<T>(
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T>,
): Promise<T> {
  const now = Date.now()
  const hit = store.get(key) as Entry<T> | undefined
  if (hit && hit.expiresAt > now) {
    return hit.value
  }

  // 진행 중인 promise 를 저장해 동시 호출자가 한 번의 조회를 공유하게 한다
  // (스탬피드 방지). 단, 실패하면 제거해서 일시적 실패가 TTL 내내 캐시되지 않게 한다.
  const value = produce()
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key)
  })
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 })
  return value
}

/** 캐시를 통째로 비운다. "새로고침" 시 디스크에서 다시 읽도록 호출한다. */
export function clearCache(): void {
  store.clear()
}
