import {Module} from '@nestjs/common';
import {AuthController} from './auth.controller.js';
import {AuthService} from './auth.service.js';
import {EmailService} from './email.service.js';
import {SessionService} from './session.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailService, SessionService],
  exports: [SessionService, EmailService],
})
export class AuthModule {}
