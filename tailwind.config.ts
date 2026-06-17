import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // GitHub Primer semantic tokens — values flip light/dark via CSS vars in
      // globals.css, so `bg-canvas`/`text-fg`/`border-line` need no `dark:` twin.
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',
        inset: 'rgb(var(--inset) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        hover: 'rgb(var(--hover) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
