import {ExpressAdapter} from '@nestjs/platform-express';
import request from 'supertest';
import {installRateLimits} from './rate-limits.js';

function createServer() {
  const server = new ExpressAdapter().getInstance();
  installRateLimits(server, true);
  server.use((_req: unknown, res: {sendStatus: (status: number) => void}) => res.sendStatus(204));
  return server;
}

describe('hosted request limits', () => {
  it.each([
    ['register', 5], ['resend-verification', 3], ['login', 8],
  ])('limits %s attempts and returns a usable retry response', async (route, limit) => {
    const server = createServer();
    for (let i = 0; i < Number(limit); i++) {
      await request(server).post(`/api/auth/${route}`).set('X-Forwarded-For', '192.0.2.1').expect(204);
    }
    const response = await request(server).post(`/api/auth/${route}`).set('X-Forwarded-For', '192.0.2.1').expect(429);
    expect(response.body.statusCode).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    await request(server).post(`/api/auth/${route}`).set('X-Forwarded-For', '192.0.2.2').expect(204);
  });

  it('limits general API requests without consuming another client’s quota', async () => {
    const server = createServer();
    for (let i = 0; i < 120; i++) await request(server).get('/api/health').set('X-Forwarded-For', '192.0.2.1').expect(204);
    await request(server).get('/api/health').set('X-Forwarded-For', '192.0.2.1').expect(429);
    await request(server).get('/api/health').set('X-Forwarded-For', '192.0.2.2').expect(204);
  });
});
