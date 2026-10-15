import {Controller, Get} from '@nestjs/common';
import {Public} from '../common/auth/public.decorator.js';
@Controller('health')
export class HealthController {
  @Public() @Get() getHealth() { return {status: 'ok', service: 'housefamily-api'}; }
}
