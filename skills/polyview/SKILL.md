---
name: polyview
description: 로컬 디렉터리의 파일을 브라우저에서 시각적으로 렌더링해 보여줍니다. "이거 시각화해줘", "이 컴포넌트/스펙/마크다운 미리보기", "브라우저로 보여줘", "polyview로 열어줘", "visualize / preview this" 등의 요청 시 사용합니다. tsx 독립 컴포넌트·html·markdown·OpenAPI(yaml/json) 스펙·소스코드를 각 형식에 맞게 렌더링합니다.
user-invocable: true
allowed-tools: Bash
---

# Polyview — 로컬 파일 시각화

지정한 로컬 디렉터리를 dev 서버로 띄워 브라우저에서 렌더링합니다.

- `.tsx` 독립 컴포넌트/페이지 → sandbox에서 실제 렌더
- `.md` → GFM, `.html` → sandbox iframe 미리보기
- `.yaml`/`.json` OpenAPI 스펙 → 상단 **Raw/OpenAPI 토글**(Scalar)
- `.ts`/`.js` 등 소스코드 → **Carbon 스타일 다크 뷰**(Shiki 하이라이팅)

앱과 런처는 이 플러그인 안에 있습니다: `${CLAUDE_PLUGIN_ROOT}`.

## 실행 단계

1. **대상 디렉터리 결정** — 사용자가 보고 싶어 하는 디렉터리. 별도 지정이 없으면 현재 작업 디렉터리(`pwd`)를 사용한다.

2. **의존성 확인 (최초 1회, ~1분 소요)** — 플러그인은 설치 시 의존성을 받지 않으므로, `node_modules`가 없으면 먼저 설치한다:
   ```bash
   [ -d "${CLAUDE_PLUGIN_ROOT}/node_modules" ] || (cd "${CLAUDE_PLUGIN_ROOT}" && npm install)
   ```
   설치가 필요한 경우 "최초 1회 의존성 설치 중(~1분)"이라고 사용자에게 알린다.

3. **런처 실행 (백그라운드)** — dev 서버를 띄우고 브라우저를 자동으로 연다. **반드시 백그라운드로 실행**해 서버가 계속 떠 있게 한다:
   ```bash
   "${CLAUDE_PLUGIN_ROOT}/bin/polyview" "<대상 디렉터리>"
   ```
   포트를 바꾸려면 `PORT=4000 "${CLAUDE_PLUGIN_ROOT}/bin/polyview" "<dir>"`.

4. **안내** — 서버가 뜨면 URL(기본 `http://localhost:3000/browse`)을 알려주고, 브라우저가 자동으로 열린다고 전한다. 종료는 dev 서버를 죽이면 된다(`pkill -f 'next dev'`).

## 주의

- **읽기 전용** — 대상 디렉터리에 절대 쓰지 않는다. `.git`·`node_modules`는 목록·조회 모두 제외된다.
- Node 18.17+ 필요 (런처가 nvm이 있으면 `.nvmrc`로 버전을 맞춘다).
- 포트 3000이 사용 중이면 `PORT`로 다른 포트를 지정한다.
