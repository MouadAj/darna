import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import type {Request} from 'express';
import type {HouseholdRole, Locale} from '@housefamily/shared';

export interface AuthContext {
  id: string;
  name: string;
  email: string;
  preferredLocale: Locale;
  householdId: string | null;
  householdName: string | null;
  role: HouseholdRole | null;
}

export interface AuthenticatedRequest extends Request {auth: AuthContext}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
