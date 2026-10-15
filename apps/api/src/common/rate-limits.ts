import type {Express} from 'express';
import {rateLimit} from 'express-rate-limit';

/** In-memory limits apply per warm server instance, as with the former Nest guard. */
export function installRateLimits(server: Express, behindVercel = false) {
  // Vercel overwrites X-Forwarded-For. Trust its immediate proxy, never arbitrary hops.
  if (behindVercel) server.set('trust proxy', 1);
  const limiter = (limit: number) => rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => response.status(429).json({
      statusCode: 429,
      message: 'Too many requests. Please try again in a minute.',
      timestamp: new Date().toISOString(),
    }),
  });

  server.use('/api', limiter(120));
  server.post('/api/auth/register', limiter(5));
  server.post('/api/auth/login', limiter(8));
  server.post('/api/invitations/accept', limiter(8));
}
