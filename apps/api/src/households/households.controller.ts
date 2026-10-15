import {BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Post} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {CreateHouseholdDto} from './dto.js';
import {HouseholdsService} from './households.service.js';

@ApiTags('households') @Controller('households')
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}
  @Post() create(@CurrentUser() user: AuthContext, @Body() dto: CreateHouseholdDto) { return this.households.create(user.id, dto.name); }
  @Get('family') family(@CurrentUser() user: AuthContext) {
    if (!user.householdId) throw new BadRequestException('Create or join a family home first');
    return this.households.family(user.householdId);
  }
  @Delete('members/:membershipId') remove(@CurrentUser() user: AuthContext, @Param('membershipId') membershipId: string) {
    if (!user.householdId || user.role !== 'OWNER') throw new ForbiddenException('Only the household owner can manage access');
    return this.households.removeMember(user.householdId, user.id, membershipId);
  }
}
