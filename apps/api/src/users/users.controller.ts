import {Body, Controller, Patch} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {UpdatePreferencesDto} from './dto.js';
import {UsersService} from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me/preferences')
  updatePreferences(@CurrentUser() user: AuthContext, @Body() dto: UpdatePreferencesDto) {
    return this.users.updatePreferences(user.id, dto.locale);
  }
}
