/** Full-screen error shown when required configuration is missing or invalid. */
export function ConfigError({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="max-w-lg">
        <h1 className="mb-2 text-lg font-semibold text-red-600">Configuration error</h1>
        <p className="mb-4 text-sm text-neutral-600">
          The viewer is not configured correctly. Check the environment variables.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 text-xs text-neutral-100">
          {message}
        </pre>
      </div>
    </div>
  )
}
