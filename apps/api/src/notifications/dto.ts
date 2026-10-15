import {IsString, IsUrl, Length} from 'class-validator';
export class SubscribePushDto {
  @IsUrl({require_tld: false}) endpoint: string;
  @IsString() @Length(10, 500) p256dh: string;
  @IsString() @Length(5, 500) auth: string;
}
