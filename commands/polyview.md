---
description: Polyview로 로컬 디렉터리를 브라우저에서 시각화합니다
argument-hint: "[디렉터리] (생략 시 현재 디렉터리)"
---

Polyview 뷰어로 디렉터리를 시각화한다.

대상 디렉터리: `$ARGUMENTS` (비어 있으면 현재 작업 디렉터리)

실행:

1. 대상 디렉터리를 결정한다(`$ARGUMENTS`가 있으면 그것, 없으면 `pwd`).
2. `${CLAUDE_PLUGIN_ROOT}/node_modules`가 없으면 먼저 설치한다(최초 1회, ~1분):
   `cd "${CLAUDE_PLUGIN_ROOT}" && npm install`
3. 런처를 **백그라운드로** 실행한다:
   `"${CLAUDE_PLUGIN_ROOT}/bin/polyview" "<대상 디렉터리>"`
   (포트 변경: 앞에 `PORT=4000`)
4. URL(기본 `http://localhost:3000/browse`)을 안내한다. 브라우저는 자동으로 열린다. 종료는 `pkill -f 'next dev'`.

읽기 전용이며 대상 디렉터리에 쓰지 않는다. `.git`·`node_modules`는 제외된다.
