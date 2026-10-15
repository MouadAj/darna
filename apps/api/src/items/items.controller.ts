import {BadRequestException, Body, Controller, Get, Param, Patch, Post, Query} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user';
import {CreateItemDto, ListItemsQuery, UpdateItemDto} from './dto';
import {ItemsService} from './items.service';

@ApiTags('items') @Controller()
export class ItemsController {
  constructor(private readonly items: ItemsService) {}
  private household(user: AuthContext) { if (!user.householdId) throw new BadRequestException('Join a family home first'); return user.householdId; }
  @Get('items') list(@CurrentUser() user: AuthContext, @Query() query: ListItemsQuery) { return this.items.list(this.household(user), query); }
  @Get('categories') categories(@CurrentUser() user: AuthContext) { return this.items.categories(this.household(user)); }
  @Post('items') create(@CurrentUser() user: AuthContext, @Body() dto: CreateItemDto) { return this.items.create(this.household(user), user.id, dto); }
  @Patch('items/:id') update(@CurrentUser() user: AuthContext, @Param('id') id: string, @Body() dto: UpdateItemDto) { return this.items.update(this.household(user), user.id, id, dto); }
}
