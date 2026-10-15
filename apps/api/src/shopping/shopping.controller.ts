import {BadRequestException, Controller, Get, Param, Patch, Post} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user';
import {ShoppingService} from './shopping.service';
@ApiTags('shopping') @Controller('shopping')
export class ShoppingController {
  constructor(private readonly shopping: ShoppingService) {}
  private home(user: AuthContext) { if (!user.householdId) throw new BadRequestException('Join a family home first'); return user.householdId; }
  @Get('active') active(@CurrentUser() user: AuthContext) { return this.shopping.active(this.home(user)); }
  @Post('start') start(@CurrentUser() user: AuthContext) { return this.shopping.start(this.home(user), user.id); }
  @Patch('items/:id/toggle') toggle(@CurrentUser() user: AuthContext, @Param('id') id: string) { return this.shopping.toggle(this.home(user), user.id, id); }
  @Post(':id/finish') finish(@CurrentUser() user: AuthContext, @Param('id') id: string) { return this.shopping.finish(this.home(user), user.id, id); }
}
