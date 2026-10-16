import {Transform} from 'class-transformer';
import {IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength} from 'class-validator';
import {itemDetailLimits, itemStatuses, normalizeItemDetail, priorities} from '@housefamily/shared';

export class ItemDetailsDto {
  @IsOptional() @Transform(({value}) => normalizeItemDetail(value)) @IsString() @MaxLength(itemDetailLimits.quantity) quantity?: string | null;
  @IsOptional() @Transform(({value}) => normalizeItemDetail(value)) @IsString() @MaxLength(itemDetailLimits.notes) notes?: string | null;
}
export class CreateItemDto extends ItemDetailsDto {
  @IsString() @Length(1, 120) name: string;
  @IsString() @Length(1, 60) visualKey: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsIn(priorities) priority?: (typeof priorities)[number];
  @IsOptional() @IsBoolean() usual?: boolean;
}
export class UpdateItemDto extends ItemDetailsDto {
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
