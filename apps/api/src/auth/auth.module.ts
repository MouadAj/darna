import {Module} from '@nestjs/common';
import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
import {EmailService} from './email.service';
import {SessionService} from './session.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailService, SessionService],
  exports: [SessionService, EmailService],
})
export class AuthModule {}
