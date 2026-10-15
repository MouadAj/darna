import {Body, Controller, Get, HttpCode, Post, Req, Res} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import type {Request, Response} from 'express';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {Public} from '../common/auth/public.decorator.js';
import {AuthService} from './auth.service.js';
import {DevLoginDto, LoginDto, RegisterDto, ResendVerificationDto, VerifyEmailDto} from './dto.js';
import {SessionService} from './session.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly sessions: SessionService) {}

  @Public() @Post('register') @HttpCode(202)
  register(@Body() dto: RegisterDto) { return this.auth.register(dto.name, dto.email, dto.password, dto.locale); }

  @Public() @Post('resend-verification') @HttpCode(202)
  resend(@Body() dto: ResendVerificationDto) { return this.auth.resendVerification(dto.email, dto.locale); }

  @Public() @Post('verify-email') @HttpCode(200)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Res({passthrough: true}) response: Response) {
    const result = await this.auth.verifyEmail(dto.token);
    await this.sessions.create(result.userId, response);
    return {message: 'Email confirmed and signed in', preferredLocale: result.preferredLocale};
  }

  @Public() @Post('login') @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({passthrough: true}) response: Response) {
    const result = await this.auth.login(dto.email, dto.password);
    await this.sessions.create(result.userId, response);
    return {message: 'Signed in safely', preferredLocale: result.preferredLocale};
  }

  @Public() @Post('dev-login') @HttpCode(200)
  async devLogin(@Body() dto: DevLoginDto, @Res({passthrough: true}) response: Response) {
    const result = await this.auth.devLogin(dto.email);
    await this.sessions.create(result.userId, response);
    return {message: 'Signed in for development', preferredLocale: result.preferredLocale};
  }

  @Get('me') me(@CurrentUser() user: AuthContext) { return user; }

  @Post('logout') @HttpCode(204)
  async logout(@Req() request: Request, @Res({passthrough: true}) response: Response) {
    await this.sessions.destroy(request, response);
  }
}
