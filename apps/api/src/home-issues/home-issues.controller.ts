import {BadRequestException, Body, Controller, Get, Param, Patch, Post} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {CreateIssueDto, UpdateIssueDto} from './dto.js';
import {HomeIssuesService} from './home-issues.service.js';
@ApiTags('home issues') @Controller('home-issues')
export class HomeIssuesController {
  constructor(private readonly issues: HomeIssuesService) {}
  private home(user: AuthContext) { if (!user.householdId) throw new BadRequestException('Join a family home first'); return user.householdId; }
  @Get() list(@CurrentUser() user: AuthContext) { return this.issues.list(this.home(user)); }
  @Post() create(@CurrentUser() user: AuthContext, @Body() dto: CreateIssueDto) { return this.issues.create(this.home(user), user.id, dto); }
  @Patch(':id') update(@CurrentUser() user: AuthContext, @Param('id') id: string, @Body() dto: UpdateIssueDto) { return this.issues.update(this.home(user), user.id, id, dto); }
}
