import 'reflect-metadata';
import type {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {ExpressAdapter} from '@nestjs/platform-express';
import type {NextFunction, Response} from 'express';
import request from 'supertest';
import type {AuthContext, AuthenticatedRequest} from '../common/auth/auth-user';
import {ShoppingController} from './shopping.controller';
import {ShoppingService} from './shopping.service';

const member: AuthContext = {
  id: 'member-a', name: 'Member', email: 'member@example.test', preferredLocale: 'en',
  householdId: 'household-a', householdName: 'Family', role: 'MEMBER',
};

describe('GET /api/shopping/active HTTP contract', () => {
  let app: INestApplication;
  let user: AuthContext;
  const shopping = {active: jest.fn()};

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ShoppingController],
      providers: [{provide: ShoppingService, useValue: shopping}],
    }).compile();
    app = module.createNestApplication(new ExpressAdapter());
    app.setGlobalPrefix('api');
    app.use((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {req.auth = user; next();});
    await app.init();
  });
  beforeEach(() => {user = {...member}; shopping.active.mockReset().mockResolvedValue(null);});
  afterAll(async () => {await app?.close();});

  it('returns literal JSON null when the household has no active shopping trip', async () => {
    const result = await request(app.getHttpServer()).get('/api/shopping/active')
      .expect(200).expect('Content-Type', /json/);
    expect(result.text).toBe('null');
    expect(JSON.parse(result.text)).toBeNull();
    expect(shopping.active).toHaveBeenCalledWith('household-a');
  });

  it('preserves the active trip JSON response', async () => {
    const trip = {id: 'trip-a', status: 'ACTIVE', shopper: {id: 'member-a', name: 'Member'}, items: []};
    shopping.active.mockResolvedValue(trip);
    const result = await request(app.getHttpServer()).get('/api/shopping/active')
      .expect(200).expect('Content-Type', /json/);
    expect(result.body).toEqual(trip);
    expect(shopping.active).toHaveBeenCalledWith('household-a');
  });

  it('rejects users without a household before reading shopping data', async () => {
    user = {...member, householdId: null};
    await request(app.getHttpServer()).get('/api/shopping/active').expect(400);
    expect(shopping.active).not.toHaveBeenCalled();
  });
});
