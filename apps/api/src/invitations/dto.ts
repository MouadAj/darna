import {IsEmail, IsIn, IsOptional, IsString, Length} from 'class-validator';
import {locales, type Locale} from '@housefamily/shared';
export class CreateInvitationDto {
  @IsString() @Length(2, 100) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsIn(['en', 'fr', 'ar']) locale?: string;
}
export class AcceptInvitationDto {
  @IsString() @Length(32, 200) token: string;
  @IsString() @Length(8, 128) password: string;
  @IsIn(locales) locale: Locale;
}
