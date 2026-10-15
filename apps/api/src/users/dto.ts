import {IsIn} from 'class-validator';
import {locales, type Locale} from '@housefamily/shared';

export class UpdatePreferencesDto {
  @IsIn(locales)
  locale: Locale;
}
