/** Tiny in-memory TTL cache shared across requests in a single process. */

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

  // Store the in-flight promise so concurrent callers share one fetch
  // (stampede protection), but evict it if it rejects so a transient failure
  // isn't cached for the whole TTL.
  const value = produce()
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key)
  })
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 })
  return value
}
