// Next.js startup hook — validates required env vars once, on the Node server.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env-check');
    validateEnv();
  }
}
