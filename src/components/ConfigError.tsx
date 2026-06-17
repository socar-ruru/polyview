/** Full-screen error shown when required configuration is missing or invalid. */
export function ConfigError({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="max-w-lg">
        <h1 className="mb-2 text-lg font-semibold text-error">Configuration error</h1>
        <p className="mb-4 text-sm text-muted">
          The viewer is not configured correctly. Check the environment variables.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-line bg-subtle p-4 text-xs text-fg">
          {message}
        </pre>
      </div>
    </div>
  )
}
