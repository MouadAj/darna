import {IsIn, IsOptional, IsString, Length} from 'class-validator';
import {issueStatuses} from '@housefamily/shared';
export class CreateIssueDto {
  @IsString() @Length(3, 160) title: string;
  @IsOptional() @IsString() @Length(1, 60) visualKey?: string;
}
export class UpdateIssueDto { @IsIn(issueStatuses) status: (typeof issueStatuses)[number]; }
