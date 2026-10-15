import {z} from 'zod';

export const itemStatuses = ['AVAILABLE', 'LOW', 'NEEDED'] as const;
export const priorities = ['NORMAL', 'SOON', 'URGENT'] as const;
export const householdRoles = ['OWNER', 'MEMBER'] as const;
export const issueStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
export const locales = ['en', 'fr', 'ar'] as const;

export type ItemStatus = (typeof itemStatuses)[number];
export type Priority = (typeof priorities)[number];
export type HouseholdRole = (typeof householdRoles)[number];
export type IssueStatus = (typeof issueStatuses)[number];
export type Locale = (typeof locales)[number];

export const updateItemSchema = z.object({
  status: z.enum(itemStatuses).optional(),
  priority: z.enum(priorities).optional(),
  usual: z.boolean().optional(),
});

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  preferredLocale: Locale;
  householdId: string | null;
  householdName: string | null;
  role: HouseholdRole | null;
}

export interface ItemSummary {
  id: string;
  name: string;
  visualKey: string;
  status: ItemStatus;
  priority: Priority;
  usual: boolean;
  category: {id: string; name: string; key: string} | null;
  updatedBy: {id: string; name: string};
  updatedAt: string;
}
