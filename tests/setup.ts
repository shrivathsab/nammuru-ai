import { vi } from 'vitest';

// Dummy env so modules that read env at import time construct without throwing
// (e.g. lib/ratelimit → Redis.fromEnv()). Never overwrites a real value.
process.env.UPSTASH_REDIS_REST_URL ||= 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN ||= 'test-token';
process.env.HMAC_SECRET ||= 'test-hmac-secret-32-chars-minimum-ok';
process.env.CRON_SECRET ||= 'test-cron-secret';
process.env.BASE_URL ||= 'http://localhost:3000';
process.env.CITIZEN_EMAIL_FROM ||= 'onboarding@resend.dev';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';
process.env.ANTHROPIC_API_KEY ||= 'test-anthropic-key';
process.env.RESEND_API_KEY ||= 'test-resend-key';

// Silence expected console.error noise from routes' catch blocks.
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});
