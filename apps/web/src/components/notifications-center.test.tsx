import {act, fireEvent, screen, waitFor, within} from '@testing-library/react';
import {QueryClient, focusManager, onlineManager} from '@tanstack/react-query';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {HouseholdNotification, NotificationInbox} from '@housefamily/shared';
import {renderWithProviders} from '@/test-utils';
import {NotificationsCenter} from './notifications-center';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import ar from '../../messages/ar.json';
const mocks=vi.hoisted(()=>({api:vi.fn(),push:vi.fn()}));
vi.mock('@/lib/api',()=>({api:mocks.api}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}));
const entry=(id='notification',kind='ITEM_NEEDED'):HouseholdNotification=>({id,kind,title:'New household need',body:'Fallback message',data:{actorName:'Mouad',subjectName:'Milk',target:kind==='SHOPPING_STARTED'?'shopping':'needs'},status:'UNREAD',createdAt:'2026-10-17T10:00:00Z'});
let rows:HouseholdNotification[];
const response=():NotificationInbox=>({items:rows,unreadCount:rows.filter(r=>r.status==='UNREAD').length,nextCursor:null});
beforeEach(()=>{
  rows=[entry()];mocks.api.mockReset();mocks.push.mockReset();
  mocks.api.mockImplementation((path:string,options?:RequestInit)=>{
    if(options?.method==='PATCH'){
      rows=rows.map(row=>path==='/notifications/read-all'||path===`/notifications/${row.id}/read`?{...row,status:'READ'}:row);
      return Promise.resolve({});
    }
    return Promise.resolve(response());
  });
});
afterEach(()=>{focusManager.setFocused(undefined);onlineManager.setOnline(true);vi.useRealTimers();});
const renderCenter=(userId='user',householdId='home',client?:QueryClient)=>renderWithProviders(<NotificationsCenter userId={userId} householdId={householdId}/>,client);
const open=async()=>fireEvent.click(await screen.findByRole('button',{name:'Notifications, 1 unread'}));

describe('household notification inbox',()=>{
  it('shows an unread badge and opens the inbox without marking anything read',async()=>{
    renderCenter();await open();
    const dialog=screen.getByRole('dialog',{name:'Notifications'});
    expect(within(dialog).getByText('Mouad added Milk to what your home needs.')).toBeVisible();
    expect(mocks.api.mock.calls.some(([,options])=>options?.method)).toBe(false);
  });
  it('marks one notification read and navigates to Needs',async()=>{
    renderCenter();await open();fireEvent.click(screen.getByRole('button',{name:/Something is needed/}));
    await waitFor(()=>expect(mocks.push).toHaveBeenCalledWith('/en/needs'));
    expect(mocks.api).toHaveBeenCalledWith('/notifications/notification/read',{method:'PATCH'});
    expect(screen.getByRole('button',{name:'Notifications, none unread'})).toBeVisible();
  });
  it('opens Shopping for a shopping-started notification',async()=>{
    rows=[entry('start','SHOPPING_STARTED')];renderCenter();await open();fireEvent.click(screen.getByRole('button',{name:/Shopping has started/}));
    await waitFor(()=>expect(mocks.push).toHaveBeenCalledWith('/en/shopping'));
  });
  it('preserves unread state and retries when marking a notification read fails',async()=>{
    renderCenter();await open();
    mocks.api.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button',{name:/Something is needed/}));
    expect(await screen.findByRole('alert')).toHaveTextContent("That action didn't finish");expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'Notifications, 1 unread'})).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Try again'}));await waitFor(()=>expect(mocks.push).toHaveBeenCalledWith('/en/needs'));
  });
  it('marks all read without closing the inbox or navigating',async()=>{
    renderCenter();await open();fireEvent.click(screen.getByRole('button',{name:'Mark all as read'}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Notifications, none unread'})).toBeVisible());
    expect(screen.getByRole('dialog')).toBeVisible();expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText('Unread')).not.toBeInTheDocument();
  });
  it('prevents duplicate writes, navigation and dismissal while saving',async()=>{
    renderCenter();await open();let resolve!:(value:unknown)=>void;
    mocks.api.mockImplementation((path:string,options?:RequestInit)=>options?.method?new Promise(yes=>{resolve=yes;}):Promise.resolve(response()));
    const row=screen.getByRole('button',{name:/Something is needed/});fireEvent.click(row);fireEvent.click(row);
    await waitFor(()=>expect(screen.getByRole('button',{name:'Close'})).toBeDisabled());
    expect(screen.getByRole('button',{name:'Mark all as read'})).toBeDisabled();
    expect(mocks.api.mock.calls.filter(([,options])=>options?.method)).toHaveLength(1);
    fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));expect(screen.getByRole('dialog')).toBeVisible();
    await act(async()=>resolve({}));await waitFor(()=>expect(mocks.push).toHaveBeenCalledOnce());
  });
  it('loads older entries without duplicating existing entries',async()=>{
    mocks.api.mockImplementation((path:string)=>Promise.resolve(path.includes('?cursor=')?{items:[entry('older')],unreadCount:2,nextCursor:null}:{items:[entry()],unreadCount:2,nextCursor:'notification'}));
    renderCenter();fireEvent.click(await screen.findByRole('button',{name:'Notifications, 2 unread'}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Load older notifications'})).toBeEnabled());
    fireEvent.click(screen.getByRole('button',{name:'Load older notifications'}));
    await waitFor(()=>expect(screen.getAllByRole('button',{name:/Something is needed/})).toHaveLength(2));
    expect(mocks.api).toHaveBeenCalledWith('/notifications/inbox?cursor=notification');
    expect(screen.queryByRole('button',{name:'Load older notifications'})).not.toBeInTheDocument();
  });
  it('recovers from an initial load failure and shows an honest empty state',async()=>{
    mocks.api.mockRejectedValue(new Error('offline'));renderCenter();fireEvent.click(screen.getByRole('button',{name:'Notifications'}));
    expect(await screen.findByRole('button',{name:'Try again'})).toBeEnabled();
    rows=[];mocks.api.mockResolvedValue(response());fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    expect(await screen.findByText('You’re all caught up')).toBeVisible();
  });
  it('retains cached notifications after a background failure',async()=>{
    const view=renderCenter();await open();mocks.api.mockRejectedValue(new Error('offline'));
    await act(async()=>{await view.client.invalidateQueries({queryKey:['notifications']});});
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load");expect(screen.getByText('Mouad added Milk to what your home needs.')).toBeVisible();
  });
  it('isolates cached inboxes when switching users or households',async()=>{
    const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
    const view=renderCenter('first','home-a',client);await screen.findByRole('button',{name:'Notifications, 1 unread'});
    rows=[];view.rerender(<NotificationsCenter userId="second" householdId="home-b"/>);
    expect(screen.queryByRole('button',{name:'Notifications, 1 unread'})).not.toBeInTheDocument();
    expect(await screen.findByRole('button',{name:'Notifications, none unread'})).toBeVisible();
    expect(client.getQueryData(['notifications','home-a','first'])).toBeDefined();expect(client.getQueryData(['notifications','home-b','second'])).toBeDefined();
  });
  it('refreshes the unread count while visible and pauses polling while unfocused',async()=>{
    vi.useFakeTimers();focusManager.setFocused(true);renderCenter();
    await act(async()=>{await vi.advanceTimersByTimeAsync(10);});
    expect(screen.getByRole('button',{name:'Notifications, 1 unread'})).toBeVisible();
    rows=[entry(),entry('second')];await act(async()=>{await vi.advanceTimersByTimeAsync(30_000);});
    expect(screen.getByRole('button',{name:'Notifications, 2 unread'})).toBeVisible();
    focusManager.setFocused(false);const calls=mocks.api.mock.calls.length;
    await act(async()=>{await vi.advanceTimersByTimeAsync(30_000);});expect(mocks.api).toHaveBeenCalledTimes(calls);
    rows.push(entry('third'));await act(async()=>{focusManager.setFocused(true);await vi.advanceTimersByTimeAsync(10);});
    expect(screen.getByRole('button',{name:'Notifications, 3 unread'})).toBeVisible();
    onlineManager.setOnline(false);rows.push(entry('fourth'));
    await act(async()=>{onlineManager.setOnline(true);await vi.advanceTimersByTimeAsync(10);});
    expect(screen.getByRole('button',{name:'Notifications, 4 unread'})).toBeVisible();
  });
  it('renders legacy content as plain text and caps the visible badge',async()=>{
    mocks.api.mockResolvedValue({items:[{...entry(),kind:'LEGACY',data:null,title:'<img src=x>',body:'Legacy body'}],unreadCount:123,nextCursor:null});
    const view=renderCenter();fireEvent.click(await screen.findByRole('button',{name:'Notifications, 123 unread'}));
    expect(screen.getByText('99+')).toBeVisible();expect(screen.getByText('<img src=x>')).toBeVisible();expect(view.container.querySelector('img')).toBeNull();
  });
  it.each([['en',en],['fr',fr],['ar',ar]] as const)('localizes notification content in %s',(locale,messages)=>{
    const client=new QueryClient();client.setQueryData(['notifications','home','user'],{pages:[response()],pageParams:[null]});
    renderWithProviders(<NextIntlClientProvider locale={locale} messages={messages}><NotificationsCenter userId="user" householdId="home"/></NextIntlClientProvider>,client);
    fireEvent.click(screen.getByRole('button',{name:new RegExp(messages.inbox.title)}));
    expect(screen.getByRole('dialog',{name:messages.inbox.title})).toBeVisible();expect(screen.getByText(messages.inbox.events.ITEM_NEEDED.title)).toBeVisible();
  });
});
