import {IsString, Length} from 'class-validator';
export class CreateHouseholdDto { @IsString() @Length(2, 120) name: string; }
