/**
 * Server-side syntax highlighting with Shiki (the VS Code engine). Highlighting
 * happens on the server and only the rendered HTML is shipped, so the client
 * carries no highlighter bundle.
 *
 * Grammars and the theme are imported statically (not lazy-loaded) so Next.js
 * standalone tracing bundles them — required for the Docker image to work — and
 * the JavaScript regex engine avoids shipping/locating a WASM file at runtime.
 */
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import githubLight from 'shiki/themes/github-light.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import javascript from 'shiki/langs/javascript.mjs'
import jsx from 'shiki/langs/jsx.mjs'
import json from 'shiki/langs/json.mjs'
import yaml from 'shiki/langs/yaml.mjs'
import html from 'shiki/langs/html.mjs'
import xml from 'shiki/langs/xml.mjs'
import css from 'shiki/langs/css.mjs'
import scss from 'shiki/langs/scss.mjs'
import bash from 'shiki/langs/bash.mjs'
import python from 'shiki/langs/python.mjs'
import go from 'shiki/langs/go.mjs'
import rust from 'shiki/langs/rust.mjs'
import java from 'shiki/langs/java.mjs'
import kotlin from 'shiki/langs/kotlin.mjs'
import sql from 'shiki/langs/sql.mjs'
import markdown from 'shiki/langs/markdown.mjs'
import toml from 'shiki/langs/toml.mjs'
import ini from 'shiki/langs/ini.mjs'

// Dual theme: light is the default inline color, dark is emitted as a
// `--shiki-dark` CSS variable that globals.css flips to under `.dark`.
const THEMES = { light: 'github-light', dark: 'github-dark' } as const

let highlighterPromise: Promise<HighlighterCore> | null = null
let loadedLangs: Set<string> | null = null

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubLight, githubDark],
      // Keep this set in sync with SHIKI_LANG in lib/extensions.ts — a mapped
      // language that is not registered here silently falls back to plain text.
      langs: [
        typescript, tsx, javascript, jsx, json, yaml, html, xml, css, scss,
        bash, python, go, rust, java, kotlin, sql, markdown, toml, ini,
      ],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    })
  }
  return highlighterPromise
}

/** Highlights source into themed HTML; unknown languages render as plain text. */
export async function highlightCode(code: string, lang: string | undefined): Promise<string> {
  const hl = await getHighlighter()
  loadedLangs ??= new Set(hl.getLoadedLanguages())
  const resolved = lang && loadedLangs.has(lang) ? lang : 'text'
  return hl.codeToHtml(code, { lang: resolved, themes: THEMES })
}
