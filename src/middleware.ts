import { NextRequest, NextResponse } from 'next/server'

/**
 * Optional HTTP Basic Auth gate. Active only when BASIC_AUTH_USER and
 * BASIC_AUTH_PASSWORD are both set; otherwise every request passes through so
 * the app can sit behind an external SSO proxy (Cloudflare Access, oauth2-proxy).
 *
 * Runs on the Edge runtime, so it reads env directly rather than via the
 * Node-only config module. Env is fixed for the process lifetime, so the
 * credentials are read once at module load rather than on every request.
 */
const AUTH_USER = process.env.BASIC_AUTH_USER?.trim()
const AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD?.trim()
const AUTH_ENABLED = Boolean(AUTH_USER && AUTH_PASSWORD)

export function middleware(req: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next()

  const header = req.headers.get('authorization')
  if (header) {
    const [scheme, encoded] = header.split(' ')
    if (scheme === 'Basic' && encoded) {
      const [u, p] = atob(encoded).split(':')
      if (safeEqual(u, AUTH_USER!) && safeEqual(p, AUTH_PASSWORD!)) {
        return NextResponse.next()
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="polyview", charset="UTF-8"' },
  })
}

/** Constant-time-ish comparison to avoid trivially leaking length/early-exit. */
function safeEqual(a: string | undefined, b: string): boolean {
  if (typeof a !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < b.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
