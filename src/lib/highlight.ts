/**
 * Shiki(VS Code 엔진)를 이용한 구문 강조. 데스크탑 앱이라 webview 안에서
 * 클라이언트 사이드로 동작한다. 이 모듈 자체는 Browse 화면에서 코드 파일을 열 때
 * 동적 import 되어 초기 번들에서 분리된다.
 *
 * JavaScript 정규식 엔진을 써서 런타임에 WASM 파일을 로드/탐색하지 않으므로
 * 완전한 오프라인 동작이 보장된다.
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

// 듀얼 테마: light 는 기본 인라인 색상이고, dark 는 `--shiki-dark` CSS 변수로
// 출력되어 globals.css 가 `.dark` 클래스에서 이를 적용한다.
const THEMES = { light: 'github-light', dark: 'github-dark' } as const

let highlighterPromise: Promise<HighlighterCore> | null = null
let loadedLangs: Set<string> | null = null

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubLight, githubDark],
      // lib/extensions.ts 의 SHIKI_LANG 과 이 목록을 동기화해야 한다.
      // 여기 등록되지 않은 언어는 조용히 plain text 로 대체된다.
      langs: [
        typescript, tsx, javascript, jsx, json, yaml, html, xml, css, scss,
        bash, python, go, rust, java, kotlin, sql, markdown, toml, ini,
      ],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    })
  }
  return highlighterPromise
}

/** 소스를 테마가 적용된 HTML 로 강조한다. 알 수 없는 언어는 plain text 로 렌더링된다. */
export async function highlightCode(code: string, lang: string | undefined): Promise<string> {
  const hl = await getHighlighter()
  loadedLangs ??= new Set(hl.getLoadedLanguages())
  const resolved = lang && loadedLangs.has(lang) ? lang : 'text'
  return hl.codeToHtml(code, { lang: resolved, themes: THEMES })
}
