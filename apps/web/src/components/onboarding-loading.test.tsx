import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import {QueryClient} from '@tanstack/react-query';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderWithProviders} from '@/test-utils';
import type {SessionUser} from '@/lib/types';
import CreateHomePage from '@/app/[locale]/create-home/page';
import HomePage from '@/app/[locale]/(app)/page';
import NeedsPage from '@/app/[locale]/(app)/needs/page';
import ShoppingPage from '@/app/[locale]/(app)/shopping/page';
import FamilyPage from '@/app/[locale]/(app)/family/page';
import ActivityPage from '@/app/[locale]/(app)/activity/page';
import IssuesPage from '@/app/[locale]/(app)/issues/page';
import {AppShell} from './app-shell';

const mocks=vi.hoisted(()=>({api:vi.fn(),replace:vi.fn()}));
vi.mock('next/navigation',()=>({useParams:()=>({locale:'en'}),usePathname:()=>'/en',useSearchParams:()=>new URLSearchParams(),useRouter:()=>({replace:mocks.replace,push:vi.fn()})}));
vi.mock('@/lib/api',async original=>({...await original<typeof import('@/lib/api')>(),api:mocks.api}));
const noHome:SessionUser={id:'u',name:'Mouad',email:'m@example.test',preferredLocale:'en',householdId:null,householdName:null,role:null};
const owner:SessionUser={...noHome,householdId:'home',householdName:'Our Home',role:'OWNER'};
function deferred<T>(){let resolve!:(value:T)=>void;let reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function createHome(){fireEvent.change(await screen.findByLabelText('Family home name'),{target:{value:'Our Home'}});fireEvent.click(screen.getByRole('button',{name:'Create our home'}));}
beforeEach(()=>{mocks.api.mockReset();mocks.replace.mockReset();});

describe('creating a home',()=>{
  it('refreshes a stale session before opening the dashboard and keeps the success toast',async()=>{
    let created=false;
    mocks.api.mockImplementation((path:string)=>{if(path==='/households'){created=true;return Promise.resolve({id:'home',name:'Our Home'});}return Promise.resolve(created?owner:noHome);});
    const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});client.setQueryData(['me'],noHome);
    const view=renderWithProviders(<CreateHomePage/>,client);await createHome();
    await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith('/en'));
    expect(client.getQueryData(['me'])).toEqual(owner);
    expect(screen.getByText('Your home is ready',{selector:'.toast span'})).toBeVisible();
    view.rerender(<AppShell>Dashboard content</AppShell>);
    expect(await screen.findByText('Dashboard content')).toBeVisible();
    expect(mocks.replace).not.toHaveBeenCalledWith('/en/create-home');
    expect(mocks.replace).not.toHaveBeenCalledWith('/en/family?invite=1');
  });

  it('prevents duplicate clicks and keeps progress visible until creation completes',async()=>{
    const pending=deferred<{id:string}>();let created=false;
    mocks.api.mockImplementation((path:string)=>path==='/households'?pending.promise.then(value=>{created=true;return value;}):Promise.resolve(created?owner:noHome));
    renderWithProviders(<CreateHomePage/>);await createHome();
    const button=await screen.findByRole('button',{name:'Creating your home…'});expect(button).toBeDisabled();fireEvent.click(button);
    expect(mocks.api.mock.calls.filter(([path])=>path==='/households')).toHaveLength(1);
    expect(mocks.replace).not.toHaveBeenCalled();
    await act(async()=>pending.resolve({id:'home'}));await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith('/en'));
  });

  it('retries only session synchronization when the home was already saved',async()=>{
    let created=false;let syncFailed=true;
    mocks.api.mockImplementation((path:string)=>{
      if(path==='/households'){created=true;return Promise.resolve({id:'home'});}
      return created?(syncFailed?Promise.reject(new Error('offline')):Promise.resolve(owner)):Promise.resolve(noHome);
    });
    renderWithProviders(<CreateHomePage/>);await createHome();
    expect(await screen.findByRole('alert')).toHaveTextContent('Your home was created');expect(mocks.replace).not.toHaveBeenCalled();
    syncFailed=false;fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith('/en'));
    expect(mocks.api.mock.calls.filter(([path])=>path==='/households')).toHaveLength(1);
  });

  it('preserves the name and allows retry when creation fails',async()=>{
    mocks.api.mockImplementation((path:string)=>path==='/households'?Promise.reject(new Error('Could not save')):Promise.resolve(noHome));
    renderWithProviders(<CreateHomePage/>);await createHome();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByLabelText('Family home name')).toHaveValue('Our Home');expect(screen.getByRole('button',{name:'Create our home'})).toBeEnabled();expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('opens an existing home without offering another creation request',async()=>{
    mocks.api.mockResolvedValue(owner);renderWithProviders(<CreateHomePage/>);
    await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith('/en'));
    expect(screen.queryByRole('button',{name:'Create our home'})).not.toBeInTheDocument();
    expect(mocks.api.mock.calls.every(([path])=>path==='/auth/me')).toBe(true);
  });
});

describe('page loading and refreshes',()=>{
  it.each([['Dashboard',HomePage],['Needs',NeedsPage],['Shopping',ShoppingPage],['Family',FamilyPage],['Activity',ActivityPage],['Issues',IssuesPage]])('shows an accessible skeleton while %s data is pending',(_name,Page)=>{
    mocks.api.mockImplementation(()=>new Promise(()=>{}));renderWithProviders(<Page/>);
    const status=screen.getByRole('status',{name:'Making things ready…'});expect(status).toHaveAttribute('aria-busy','true');
    expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull();expect(status.querySelector('button')).toBeNull();
  });

  it('does not show an empty shopping state before the item request finishes',async()=>{
    const items=deferred<unknown[]>();mocks.api.mockImplementation((path:string)=>path==='/shopping/active'?Promise.resolve(null):items.promise);
    renderWithProviders(<ShoppingPage/>);
    await waitFor(()=>expect(mocks.api).toHaveBeenCalledWith('/items'));
    expect(screen.getByRole('status',{name:'Making things ready…'})).toBeVisible();expect(screen.queryByRole('button',{name:'Start shopping'})).not.toBeInTheDocument();
    await act(async()=>items.resolve([]));expect(await screen.findByText('Nothing to shop for')).toBeVisible();
  });

  it('keeps cached content and navigation visible through a failed background refresh',async()=>{
    const refresh=deferred<unknown[]>();const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
    client.setQueryData(['me'],owner);client.setQueryData(['items'],[]);client.setQueryData(['issues'],[]);
    mocks.api.mockImplementation((path:string)=>path==='/items'?refresh.promise:Promise.resolve(path==='/auth/me'?owner:[]));
    renderWithProviders(<AppShell><HomePage/></AppShell>,client);
    expect(await screen.findByText('Everything looks good')).toBeVisible();
    await act(async()=>{void client.invalidateQueries({queryKey:['items']});});
    expect(screen.getByText('Everything looks good')).toBeVisible();expect(await screen.findByText('Updating…')).toBeVisible();
    expect(screen.getAllByRole('navigation')).toHaveLength(2);
    await act(async()=>refresh.reject(new Error('offline')));
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load");expect(screen.getByText('Everything looks good')).toBeVisible();
  });

  it('lets onboarding recover from a failed initial session check',async()=>{
    mocks.api.mockRejectedValue(new Error('offline'));renderWithProviders(<CreateHomePage/>);
    const retry=await screen.findByRole('button',{name:'Try again'});
    expect(screen.queryByRole('button',{name:'Create our home'})).not.toBeInTheDocument();
    mocks.api.mockResolvedValue(noHome);fireEvent.click(retry);
    expect(await screen.findByLabelText('Family home name')).toBeVisible();
    expect(mocks.api.mock.calls.every(([path])=>path==='/auth/me')).toBe(true);
  });
});
