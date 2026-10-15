import {Module} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {ConfigModule} from '@nestjs/config';
import {ThrottlerGuard, ThrottlerModule} from '@nestjs/throttler';
import {AuthModule} from './auth/auth.module.js';
import {SessionGuard} from './common/auth/session.guard.js';
import {PrismaModule} from './prisma/prisma.module.js';
import {HealthModule} from './health/health.module.js';
import {HouseholdsModule} from './households/households.module.js';
import {InvitationsModule} from './invitations/invitations.module.js';
import {ItemsModule} from './items/items.module.js';
import {ShoppingModule} from './shopping/shopping.module.js';
import {HomeIssuesModule} from './home-issues/home-issues.module.js';
import {ActivityModule} from './activity/activity.module.js';
import {NotificationsModule} from './notifications/notifications.module.js';
import {UsersModule} from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true, envFilePath: ['../../.env', '.env']}),
    ThrottlerModule.forRoot([{ttl: 60_000, limit: 120}]),
    PrismaModule,
    AuthModule,
    HealthModule,
    HouseholdsModule,
    InvitationsModule,
    ItemsModule,
    ShoppingModule,
    HomeIssuesModule,
    ActivityModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [
    {provide: APP_GUARD, useClass: ThrottlerGuard},
    {provide: APP_GUARD, useClass: SessionGuard},
  ],
})
export class AppModule {}
