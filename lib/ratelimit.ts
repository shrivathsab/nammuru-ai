import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const IS_DEV = process.env.NODE_ENV === 'development';

type Window = Parameters<typeof Ratelimit.slidingWindow>[1];

function createLimiter(
  redisClient: Redis,
  limit: number,
  window: Window,
  prefix: string,
): Ratelimit {
  return new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix,
  });
}

/** 5 classify calls per minute per IP (200/min in dev) */
export const classifyLimiter = createLimiter(
  redis, IS_DEV ? 200 : 5, '1 m', 'nammuru:classify',
);

/** 3 submissions per hour per IP — burst protection (100/hr in dev) */
export const submitHourlyLimiter = createLimiter(
  redis, IS_DEV ? 100 : 3, '1 h', 'nammuru:submit:hourly',
);

/** 5 submissions per day per IP — abuse protection (200/day in dev) */
export const submitDailyLimiter = createLimiter(
  redis, IS_DEV ? 200 : 5, '24 h', 'nammuru:submit:daily',
);

/** 3 draft-content calls per minute per IP (100/min in dev) */
export const draftContentLimiter = createLimiter(
  redis, IS_DEV ? 100 : 3, '1 m', 'nammuru:draft-content',
);

/** Extract IP from request headers */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}
