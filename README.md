# Polyview

private GitHub 저장소를 미러링해서, 올라온 파일을 브라우저에서 바로 렌더링하는 뷰어입니다.
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

또는 이미지 직접 실행:

```bash
docker build -t polyview .
docker run -p 3000:3000 \
  -e GITHUB_TOKEN=ghp_xxx \
  -e GITHUB_REPO=my-org/my-private-repo \
  -e GITHUB_BRANCH=main \
  polyview
```

## 환경 변수

| 변수 | 필수 | 기본값 | 설명 |
|------|:---:|--------|------|
| `GITHUB_TOKEN` | ✅ | — | 대상 repo **contents 읽기** 권한 토큰(PAT 또는 GitHub App) |
| `GITHUB_REPO` | ✅ | — | `owner/name` 형식 |
| `GITHUB_BRANCH` | | `main` | 읽어올 브랜치 |
| `GITHUB_BASE_PATH` | | (repo 루트) | **뷰어의 루트 디렉터리.** 이 하위 파일만 목록·조회 가능하며, 이 밖의 경로는 직접 요청으로도 접근 불가 |
| `BASIC_AUTH_USER` | | — | 설정 시 Basic Auth 게이트 활성화 |
| `BASIC_AUTH_PASSWORD` | | — | 위와 **둘 다** 있어야 적용 |
| `APP_TITLE` | | `Polyview` | 헤더/탭 제목 |
| `CACHE_TTL` | | `60` | GitHub API 응답 메모리 캐시(초) |
| `MAX_FILE_BYTES` | | `2097152` | 렌더링할 최대 파일 크기(바이트) |

## 접근 제어 (private 운영)

회사 정보를 다루므로 **두 가지 중 하나는 반드시** 두는 걸 권장합니다.

1. **내장 Basic Auth** — `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` 설정. 가장 간단.
2. **외부 SSO 프록시** — Cloudflare Access(Zero Trust), oauth2-proxy 등을 앞단에 배치.
   이 경우 Basic Auth 변수는 비워둡니다.

## 동작 방식

- GitHub Git Trees API로 파일 목록을, Contents API로 개별 파일을 **런타임에 조회**합니다(메모리 TTL 캐시). 별도 빌드/동기화 파이프라인이 없습니다 — repo가 곧 source of truth.
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
