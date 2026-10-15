import {Module} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {ConfigModule} from '@nestjs/config';
import {ThrottlerGuard, ThrottlerModule} from '@nestjs/throttler';
import {AuthModule} from './auth/auth.module';
import {SessionGuard} from './common/auth/session.guard';
import {PrismaModule} from './prisma/prisma.module';
import {HealthModule} from './health/health.module';
import {HouseholdsModule} from './households/households.module';
import {InvitationsModule} from './invitations/invitations.module';
import {ItemsModule} from './items/items.module';
import {ShoppingModule} from './shopping/shopping.module';
import {HomeIssuesModule} from './home-issues/home-issues.module';
import {ActivityModule} from './activity/activity.module';
import {NotificationsModule} from './notifications/notifications.module';
import {UsersModule} from './users/users.module';

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
