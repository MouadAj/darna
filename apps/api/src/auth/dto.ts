import {IsEmail, IsIn, IsOptional, IsString, Length} from 'class-validator';

const locales = ['en', 'fr', 'ar'] as const;

export class RegisterDto {
  @IsString() @Length(2, 100) name: string;
  @IsEmail() email: string;
  @IsString() @Length(8, 128) password: string;
  @IsOptional() @IsIn(locales) locale?: (typeof locales)[number];
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @Length(8, 128) password: string;
}

export class VerifyEmailDto {
  @IsString() @Length(32, 200) token: string;
}

export class ResendVerificationDto {
  @IsEmail() email: string;
  @IsOptional() @IsIn(locales) locale?: (typeof locales)[number];
}

export class DevLoginDto {
  @IsEmail() email: string;
}
