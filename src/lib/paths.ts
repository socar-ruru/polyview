/** Path helpers safe for both server and client (no Node dependencies). */

/** Last segment of a forward-slash path, e.g. "a/b/c.ts" → "c.ts". */
export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}
