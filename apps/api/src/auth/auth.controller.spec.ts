import 'reflect-metadata';
import {ValidationPipe, type INestApplication} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {APP_GUARD} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import {ExpressAdapter} from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import {PrismaService} from '../prisma/prisma.service.js';
import {SessionGuard} from '../common/auth/session.guard.js';
import {AuthController} from './auth.controller.js';
import {AuthService} from './auth.service.js';
import {SessionService} from './session.service.js';

describe('registration session HTTP contract', () => {
  let app: INestApplication;
  const user = {id: 'u', name: 'Mouad', email: 'mouad@example.test', preferredLocale: 'EN', emailVerifiedAt: null, memberships: []};
  const prisma = {
    user: {findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(user)},
    session: {create: jest.fn(), findUnique: jest.fn()},
  };
  beforeAll(async () => {
    prisma.session.create.mockImplementation(({data}) => {prisma.session.findUnique.mockResolvedValue({...data, user});});
    const module = await Test.createTestingModule({controllers: [AuthController], providers: [
      AuthService, SessionService, {provide: APP_GUARD, useClass: SessionGuard},
      {provide: PrismaService, useValue: prisma},
      {provide: ConfigService, useValue: {get: (key: string, fallback?: unknown) => key === 'NODE_ENV' ? 'production' : fallback}},
    ]}).compile();
    app = module.createNestApplication(new ExpressAdapter());
    app.setGlobalPrefix('api');app.use(cookieParser());app.useGlobalPipes(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true, transform: true}));
    await app.init();
  });
  afterAll(async () => {await app?.close();});

  it('returns a secure session immediately and accepts it without a verification timestamp', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/register').send({name: 'Mouad', email: user.email, password: 'secure-password'}).expect(201);
    expect(response.body).toEqual({message: 'Account created and signed in', preferredLocale: 'en'});
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');expect(cookie).toContain('Secure');expect(cookie).toContain('SameSite=Lax');
    const me = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie.split(';')[0]).expect(200);
    expect(me.body).toMatchObject({id: 'u', email: user.email, householdId: null});
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it.each(['verify-email', 'resend-verification'])('removes the old %s endpoint', async path => {
    await request(app.getHttpServer()).post(`/api/auth/${path}`).send({email: user.email, token: 'old-token'}).expect(404);
  });
});
