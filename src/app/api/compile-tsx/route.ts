import { NextRequest, NextResponse } from 'next/server'
import { compileTsx } from '@/lib/tsx-compiler'

// esbuild needs the Node.js runtime; never run this on the Edge.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let code: unknown
  try {
    ;({ code } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof code !== 'string' || code.length === 0) {
    return NextResponse.json({ error: 'Body must include a non-empty "code" string' }, { status: 400 })
  }

  const result = await compileTsx(code)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }
  return NextResponse.json({ js: result.js })
}
