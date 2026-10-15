import {Transform} from 'class-transformer';
import {IsBoolean, IsIn, IsOptional, IsString, Length} from 'class-validator';
import {itemStatuses, priorities} from '@housefamily/shared';

export class CreateItemDto {
  @IsString() @Length(1, 120) name: string;
  @IsString() @Length(1, 60) visualKey: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsIn(priorities) priority?: (typeof priorities)[number];
  @IsOptional() @IsBoolean() usual?: boolean;
}
export class UpdateItemDto {
  @IsOptional() @IsIn(itemStatuses) status?: (typeof itemStatuses)[number];
  @IsOptional() @IsIn(priorities) priority?: (typeof priorities)[number];
  @IsOptional() @IsBoolean() usual?: boolean;
}
export class ListItemsQuery {
  @IsOptional() @IsIn(itemStatuses) status?: (typeof itemStatuses)[number];
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Transform(({value}) => value === 'true') @IsBoolean() usual?: boolean;
}
