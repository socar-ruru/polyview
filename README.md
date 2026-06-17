# Polyview

GitHub 저장소나 로컬 디렉터리의 파일을 브라우저에서 바로 렌더링하는 뷰어입니다.
Docker 이미지에 **환경 변수만 주입하면 그대로 동작**하도록 설계했습니다.

## 무엇을 렌더링하나요

| 확장자 | 렌더링 방식 |
|--------|-------------|
| `.tsx` | 컨테이너 안에서 **esbuild로 React까지 번들링** 후 sandbox iframe에 마운트 (코드 외부 유출 없음) |
| `.html` / `.htm` | sandbox iframe (`allow-scripts`만 허용, same-origin 차단) |
| `.md` / `.markdown` | GitHub Flavored Markdown + 코드 하이라이팅 |
| `.yaml` / `.yml` / `.json` | 기본 **Raw**. OpenAPI/Swagger 스펙으로 감지되면 상단에 **OpenAPI 탭**(Scalar) 추가 |
| 이미지(`.png` 등) | 이미지로 표시 |
| **그 외 모든 확장자** | **Raw 텍스트**(구문 하이라이팅) |

## 빠른 시작

```bash
cp .env.example .env      # 값 채우기
docker compose up --build
# http://localhost:3000
```

또는 이미지 직접 실행 (GitHub 소스):

```bash
docker build -t polyview .
docker run -p 3000:3000 \
  -e SOURCE_TYPE=github \
  -e GITHUB_TOKEN=ghp_xxx \
  -e GITHUB_REPO=my-org/my-private-repo \
  polyview
```

로컬 디렉터리 소스 (볼륨 마운트):

```bash
docker run -p 3000:3000 \
  -e SOURCE_TYPE=local \
  -e LOCAL_ROOT=/data \
  -v /host/path/to/files:/data:ro \
  polyview
```

## 소스 선택

`SOURCE_TYPE`으로 백엔드를 고릅니다 (미설정 시 `GITHUB_REPO`가 있으면 `github`으로 추론).

- **`github`** — GitHub API로 repo를 런타임 조회. `GITHUB_TOKEN` + `GITHUB_REPO` 필요.
- **`local`** — 로컬 파일시스템 디렉터리를 읽음. `LOCAL_ROOT` 필요. (FTP/WebDAV 등은 `Source` 인터페이스에 추가 가능)

어느 소스든 **루트 밖 경로는 직접 요청으로도 접근 불가**하며(`..`·심볼릭 링크 탈출 차단), 현재 소스는 **설정 페이지(`/settings`)** 에서 확인할 수 있습니다.

## 로컬에서 작업 내용 시각화 (`bin/polyview`)

지금 작업 중인 **로컬 디렉터리**를 빠르게 브라우저에 띄워 보는 용도입니다. 서버를 상시 켜둘 필요 없이, 보고 싶을 때 실행하고 `Ctrl-C`로 끕니다.

**1회 설정** — 이 저장소를 클론하고 의존성을 설치한 뒤, 런처를 alias로 걸어둡니다(Node 18.17+ 필요, `.nvmrc`는 `22`):

```bash
git clone https://github.com/socar-ruru/polyview && cd polyview
npm install
echo 'alias polyview="'"$PWD"'/bin/polyview"' >> ~/.zshrc   # 또는 ~/.bashrc
```

**사용** — 보고 싶은 디렉터리에서:

```bash
polyview                 # 현재 디렉터리를 띄움
polyview ~/dev/my-app    # 특정 디렉터리
PORT=4000 polyview .     # 포트 지정
```

dev 서버가 그 디렉터리를 **읽기 전용**으로 띄우고 브라우저(`/browse`)를 자동으로 엽니다. 좌측 트리에서 파일을 고르면:

- `.tsx` 독립 컴포넌트 → 샌드박스에서 실제 렌더
- `.md` → GFM 렌더, `.html` → 샌드박스 미리보기
- `.yaml`/`.json` 이 OpenAPI 스펙이면 상단 **Raw/OpenAPI 토글**(Scalar)
- `.ts`/`.js` 등 소스코드 → **Carbon 스타일 다크 뷰**(Shiki 하이라이팅)

> `.git`·`node_modules`는 목록·조회 모두 제외됩니다. 루트 밖은 접근 불가합니다.

## Claude Code 플러그인

이 repo는 그 자체로 Claude Code 마켓플레이스입니다. 터미널에서 추가·설치하면 스킬/커맨드로 쓸 수 있습니다:

```text
/plugin marketplace add socar-ruru/polyview
/plugin install polyview@polyview
```

- **스킬** — "이 디렉터리 polyview로 보여줘"처럼 말하면 현재(또는 지정) 디렉터리를 띄웁니다.
- **커맨드** — `/polyview [디렉터리]` 로 직접 실행.

플러그인은 설치 시 의존성을 받지 않으므로 **최초 1회 실행에서 `npm install`(~1분)** 이 자동으로 돌고, 이후엔 바로 dev 서버가 떠 브라우저가 열립니다. (Node 18.17+ 필요)

## 환경 변수

| 변수 | 필수 | 기본값 | 설명 |
|------|:---:|--------|------|
| `SOURCE_TYPE` | | (추론) | `github` 또는 `local`. 미설정 시 `GITHUB_REPO` 있으면 `github` |
| `GITHUB_TOKEN` | github | — | 대상 repo **contents 읽기** 권한 토큰(PAT 또는 GitHub App) |
| `GITHUB_REPO` | github | — | `owner/name` 형식 |
| `GITHUB_BRANCH` | | `main` | 읽어올 브랜치 |
| `GITHUB_BASE_PATH` | | (repo 루트) | **뷰어의 루트 디렉터리.** 이 하위 파일만 목록·조회 가능하며, 이 밖의 경로는 직접 요청으로도 접근 불가 |
| `LOCAL_ROOT` | local | — | 로컬 소스일 때 루트로 쓸 **절대 경로**(Docker는 볼륨 마운트) |
| `BASIC_AUTH_USER` | | — | 설정 시 Basic Auth 게이트 활성화 |
| `BASIC_AUTH_PASSWORD` | | — | 위와 **둘 다** 있어야 적용 |
| `APP_TITLE` | | `Polyview` | 헤더/탭 제목 |
| `CACHE_TTL` | | `60` | 소스 파일 목록 메모리 캐시(초) |
| `MAX_FILE_BYTES` | | `2097152` | 렌더링할 최대 파일 크기(바이트) |

## 접근 제어 (private 운영)

회사 정보를 다루므로 **두 가지 중 하나는 반드시** 두는 걸 권장합니다.

1. **내장 Basic Auth** — `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` 설정. 가장 간단.
2. **외부 SSO 프록시** — Cloudflare Access(Zero Trust), oauth2-proxy 등을 앞단에 배치.
   이 경우 Basic Auth 변수는 비워둡니다.

## 동작 방식

- 파일 목록과 개별 파일을 **런타임에 조회**합니다(메모리 TTL 캐시). 별도 빌드/동기화 파이프라인이 없습니다 — 소스가 곧 source of truth. 소스 백엔드는 `Source` 인터페이스(`list`/`readText`/`readBytes`)로 추상화되어 있고(GitHub은 Trees/Contents API, Local은 파일시스템), 렌더링 계층은 어느 소스인지 알지 못합니다.
- `.tsx`는 서버의 API 라우트에서 esbuild가 번들링하며, 결과 스크립트만 sandbox iframe에 주입됩니다. **사내 코드가 외부 서비스로 전송되지 않습니다.**
- `.tsx`가 `import` 하는 라이브러리는 `package.json`에 설치된 것만 사용할 수 있습니다. 기본값은 `react`, `react-dom`.
- 허용 라이브러리를 늘리려면 (1) 의존성을 추가하고, (2) **`Dockerfile` runner 단계에 해당 패키지 `COPY` 라인을 추가**합니다. Next.js standalone 트레이싱이 서버가 직접 쓰지 않는 파일(예: `react-dom/client`)을 제거하는데, esbuild는 런타임에 이 파일들이 필요하기 때문입니다.

## 로컬 개발

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev
```

## 라이선스

MIT
