import {BadRequestException, Controller, Get, Param, Patch, Post, Res} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import type {Response} from 'express';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {ShoppingService} from './shopping.service.js';
@ApiTags('shopping') @Controller('shopping')
export class ShoppingController {
  constructor(private readonly shopping: ShoppingService) {}
  private home(user: AuthContext) { if (!user.householdId) throw new BadRequestException('Join a family home first'); return user.householdId; }
  @Get('active') async active(@CurrentUser() user: AuthContext, @Res() response: Response) {
    const trip = await this.shopping.active(this.home(user));
    // Nest sends an empty body for a returned null; clients need valid JSON here.
    return response.json(trip);
  }
  @Post('start') start(@CurrentUser() user: AuthContext) { return this.shopping.start(this.home(user), user.id); }
  @Patch('items/:id/toggle') toggle(@CurrentUser() user: AuthContext, @Param('id') id: string) { return this.shopping.toggle(this.home(user), user.id, id); }
  @Post(':id/finish') finish(@CurrentUser() user: AuthContext, @Param('id') id: string) { return this.shopping.finish(this.home(user), user.id, id); }
}
