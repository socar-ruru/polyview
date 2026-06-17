import { NextRequest, NextResponse } from 'next/server'
import { getFileBytes, FileNotFoundError, FileTooLargeError } from '@/lib/github'
import { rawContentTypeOf } from '@/lib/extensions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Serves a single file's raw bytes — used for image rendering. */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) {
    return NextResponse.json({ error: 'Missing "path" query parameter' }, { status: 400 })
  }

  try {
    const bytes = await getFileBytes(path)
    const contentType = rawContentTypeOf(path)
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        // Defence in depth: an SVG served here can never run scripts.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (err) {
    if (err instanceof FileNotFoundError) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (err instanceof FileTooLargeError) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
