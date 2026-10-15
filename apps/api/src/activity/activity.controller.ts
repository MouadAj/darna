import {BadRequestException, Controller, Get} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {CurrentUser, type AuthContext} from '../common/auth/auth-user.js';
import {PrismaService} from '../prisma/prisma.service.js';
@ApiTags('activity') @Controller('activity')
export class ActivityController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list(@CurrentUser() user: AuthContext) {
    if (!user.householdId) throw new BadRequestException('Join a family home first');
    return this.prisma.activity.findMany({where: {householdId: user.householdId}, include: {actor: {select: {id: true, name: true}}}, orderBy: {createdAt: 'desc'}, take: 80});
  }
}
