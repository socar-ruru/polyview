# Polyview

로컬 디렉터리나 GitHub 저장소의 파일을 바로 렌더링해서 보는 **가벼운 데스크탑 뷰어**입니다.
Markdown, OpenAPI, TSX, HTML, 이미지, 소스코드를 트리에서 골라 미리 봅니다.

서버를 직접 띄울 필요 없이 앱을 실행하고, **소스(로컬 폴더 / GitHub 저장소)는 설정창에서**
지정합니다. [Tauri 2](https://tauri.app)(Rust 셸) + React + Vite 로 만들어 설치 후 바로 실행됩니다.

## 무엇을 렌더링하나요

| 확장자 | 렌더링 방식 |
|--------|-------------|
| `.tsx` | **오프라인으로 Sucrase 변환** 후 sandbox iframe 에 React 로 마운트. React UMD 를 iframe 에 주입하므로 CDN·네트워크 없이 동작하고, 코드가 외부로 나가지 않습니다 |
| `.html` / `.htm` | sandbox iframe (`allow-scripts`만 허용, same-origin 차단) |
| `.md` / `.markdown` | GitHub Flavored Markdown + 코드 하이라이팅, ` ```mermaid ` 블록은 다이어그램으로 렌더 |
| `.yaml` / `.yml` / `.json` | OpenAPI/Swagger 스펙으로 감지되면 **OpenAPI 뷰**(Scalar)로 표시, 그 외에는 Raw |
| 이미지(`.png` 등) | 이미지로 표시 |
| **그 외 모든 확장자** | **Raw 텍스트**(Shiki 구문 하이라이팅) |

## 요구사항

- **Node.js 18.18+** (개발 서버 빌드용 Vite 5)
- **Rust 툴체인** (`rustup` — Tauri 셸 컴파일용). 미설치 시 <https://rustup.rs> 참고
- macOS / Windows / Linux 데스크탑

## 개발 모드로 실행

```bash
npm install
npm run tauri:dev
```

`tauri:dev` 가 Vite 개발 서버를 띄우고 네이티브 창을 엽니다. 프런트엔드 변경은 즉시 반영되고,
Rust(`src-tauri/`) 변경 시에는 자동으로 다시 컴파일됩니다.

> 첫 실행은 Rust 의존성 컴파일로 수 분이 걸릴 수 있습니다. 이후로는 캐시되어 빠릅니다.

## 설치용 앱 빌드

```bash
npm run tauri:build
```

플랫폼에 맞는 네이티브 번들(macOS `.app`/`.dmg`, Windows `.msi`/`.exe`, Linux `.deb`/`.AppImage`)이
`src-tauri/target/release/bundle/` 에 생성됩니다. 이걸 설치하면 매번 명령을 칠 필요 없이 앱으로 실행합니다.

## 소스 설정

앱 헤더의 **설정**에서 소스를 지정합니다. 설정은 OS 앱 설정 디렉터리의 `settings.json` 에 저장됩니다.

- **로컬 디렉터리** — 폴더 선택 버튼으로 뷰어 루트를 고릅니다. 이 디렉터리 하위만 목록·조회되며,
  `.git`·`node_modules`·`.DS_Store` 는 제외됩니다.
- **GitHub 저장소** — `owner/name`, 브랜치, (선택) 하위 경로를 입력하고, contents **읽기 권한**이 있는
  **Personal Access Token(PAT)** 을 입력합니다. 토큰은 `settings.json` 이 아니라 **OS 키체인**에 따로
  안전하게 보관됩니다.

그 밖에 헤더 제목, 미리보기 최대 파일 크기, 캐시 TTL 도 설정에서 조정할 수 있습니다.

## 동작 방식과 보안

- 파일 목록·내용을 **런타임에 조회**합니다(메모리 TTL 캐시). 별도 빌드/동기화 없이 소스가 곧
  source of truth 입니다. 소스 백엔드는 `Source` 인터페이스(`list`/`readText`/`readDataUrl`)로 추상화되어
  있어(GitHub 은 REST API, 로컬은 Rust 파일시스템), 렌더링 계층은 어느 소스인지 알지 못합니다.
- **루트 밖 경로는 접근할 수 없습니다.** 로컬 소스는 Rust 에서 `..`·절대경로·루트를 벗어나는 심볼릭
  링크를 모두 차단합니다.
- **`.tsx` 는 오프라인에서 Sucrase 로 변환**되어 sandbox iframe 안에서만 실행됩니다. 코드가 외부
  서비스로 전송되지 않으며, `import` 는 `react`/`react-dom` 만 iframe 전역으로 제공됩니다.
- **GitHub PAT 는 OS 키체인**(macOS Keychain / Windows Credential Manager / Linux Secret Service)에
  저장되어 평문 설정 파일에 남지 않습니다.

## 프로젝트 구조

- `src/` — React + Vite 프런트엔드(라우팅·렌더러·소스 추상화·설정 UI)
- `src-tauri/` — Rust 셸. 로컬 파일 접근, 설정/토큰 저장 등의 `tauri::command` 제공

## 개발 검증

```bash
npm run build   # tsc 타입체크 + vite 빌드
npm run lint    # ESLint (경고 0)
```

## 라이선스

MIT
