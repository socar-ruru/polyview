/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal, self-contained server bundle for Docker.
  output: 'standalone',
  experimental: {
    // esbuild ships native binaries that must not be bundled by the Next compiler;
    // keep it external so it is required from node_modules at runtime instead.
    serverComponentsExternalPackages: ['esbuild'],
  },
}

export default nextConfig
