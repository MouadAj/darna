import {Body, Controller, Patch} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user';
import {UpdatePreferencesDto} from './dto';
import {UsersService} from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me/preferences')
  updatePreferences(@CurrentUser() user: AuthContext, @Body() dto: UpdatePreferencesDto) {
    return this.users.updatePreferences(user.id, dto.locale);
  }
}
