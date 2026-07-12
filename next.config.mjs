/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type-checking is handled by our own `npm run typecheck` (tsc --noEmit),
  // which runs in CI/pre-deploy. We skip Next's built-in in-build type worker
  // (flaky in Next 16.2.x) so it can't crash an otherwise-successful build.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
