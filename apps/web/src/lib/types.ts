import type {HouseholdRole, IssueStatus, ItemStatus, Priority, SessionUser} from '@housefamily/shared';
export type {SessionUser};
export interface Item {
  id: string; name: string; visualKey: string; status: ItemStatus; priority: Priority; usual: boolean; updatedAt: string;
  category: {id: string; name: string; key: string} | null; updatedBy: {id: string; name: string};
}
export interface Category {id: string; key: string; name: string}
export interface TripItem {id: string; purchased: boolean; item: Pick<Item, 'id'|'name'|'visualKey'|'priority'|'status'>}
export interface ShoppingTrip {id: string; status: string; shopper: {id: string; name: string}; items: TripItem[]}
export interface Family {
  id: string; name: string;
  members: Array<{id: string; role: HouseholdRole; joinedAt: string; user: {id: string; name: string; email: string}}>;
  invitations: Array<{id: string; invitedName: string; invitedEmail: string; expiresAt: string; status: string}>;
}
export interface HomeIssue {id: string; title: string; visualKey: string; status: IssueStatus; createdBy: {name: string}; handledBy: {name: string} | null; updatedAt: string}
export interface Activity {id: string; type: string; subjectName: string | null; metadata: Record<string, unknown> | null; actor: {id: string; name: string} | null; createdAt: string}
