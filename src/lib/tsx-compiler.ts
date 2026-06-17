import * as esbuild from 'esbuild'

/**
 * Bundles a standalone .tsx file (plus React and any whitelisted dependency that
 * is installed in node_modules) into a single self-contained IIFE that mounts
 * the file's default export into <div id="root">.
 *
 * The compile happens entirely inside the container — no code ever leaves the
 * deployment — which is the whole point of choosing esbuild over a hosted
 * bundler for private content.
 */
export async function compileTsx(source: string): Promise<{ js: string } | { error: string }> {
  try {
    const result = await esbuild.build({
      stdin: {
        contents: BOOTSTRAP,
        loader: 'tsx',
        resolveDir: process.cwd(),
      },
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      minify: true,
      write: false,
      logLevel: 'silent',
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [virtualUserModule(source)],
    })
    return { js: result.outputFiles[0].text }
  } catch (err) {
    return { error: formatBuildError(err) }
  }
}

const VIRTUAL_ID = 'virtual:user-component'
const VIRTUAL_ID_FILTER = new RegExp(`^${VIRTUAL_ID}$`)

const BOOTSTRAP = `
  import React from 'react'
  import { createRoot } from 'react-dom/client'
  import Component from '${VIRTUAL_ID}'

  const el = document.getElementById('root')
  if (el) {
    createRoot(el).render(React.createElement(React.StrictMode, null, React.createElement(Component)))
  }
`

/** Resolves the bootstrap's import of the user component to the uploaded source. */
function virtualUserModule(source: string): esbuild.Plugin {
  return {
    name: 'virtual-user-module',
    setup(build) {
      build.onResolve({ filter: VIRTUAL_ID_FILTER }, () => ({
        path: VIRTUAL_ID,
        namespace: 'virtual',
      }))
      build.onLoad({ filter: /.*/, namespace: 'virtual' }, () => ({
        contents: source,
        loader: 'tsx',
        resolveDir: process.cwd(),
      }))
    },
  }
}

function formatBuildError(err: unknown): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (err as esbuild.BuildFailure).errors
    if (Array.isArray(errors) && errors.length) {
      return errors
        .map((e) => {
          const loc = e.location ? ` (line ${e.location.line})` : ''
          return `${e.text}${loc}`
        })
        .join('\n')
    }
  }
  return err instanceof Error ? err.message : String(err)
}
