import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// Vite + React + TypeScript 용 flat config.
// (Next.js 제거로 사라진 lint 게이트를 대체한다.)
export default tseslint.config(
  // 빌드 산출물·의존성·Rust 디렉터리는 검사 대상에서 제외한다.
  { ignores: ['dist', 'node_modules', 'src-tauri', 'package-lock.json'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    // Hooks 규칙(정확성)과 Fast Refresh 규칙만 켠다. v7 의 React Compiler 계열
    // 규칙(set-state-in-effect 등)은 정당한 비동기 로딩 effect 까지 막아 제외한다.
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // `_` 접두 변수는 의도적 미사용으로 보고, `...rest` 로 제외하려고 구조분해한
      // 형제 변수(예: hast `node`)도 미사용으로 보지 않는다.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  // 컴포넌트와 훅을 한 파일에 두는 게 관용적인 곳(Context 프로바이더, 컨텍스트
  // 메뉴 훅)은 Fast Refresh 경고(only-export-components)를 적용하지 않는다.
  {
    files: [
      'src/lib/theme.tsx',
      'src/lib/settings-context.tsx',
      'src/components/ContextMenu.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // 설정 파일은 Node 환경에서 돈다.
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
