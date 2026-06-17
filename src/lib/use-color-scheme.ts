'use client'

import { useTheme } from 'next-themes'

/**
 * The resolved color scheme for render engines that theme themselves (Mermaid,
 * Scalar, sandbox iframes). Defaults to 'light' until next-themes has resolved
 * the preference on the client.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useTheme().resolvedTheme === 'dark' ? 'dark' : 'light'
}
