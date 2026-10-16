import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderWithProviders} from '@/test-utils';
import type {Item, SessionUser} from '@/lib/types';
import {ApiError} from '@/lib/api';
import HomePage from '@/app/[locale]/(app)/page';
import NeedsPage from '@/app/[locale]/(app)/needs/page';
import ShoppingPage from '@/app/[locale]/(app)/shopping/page';
import {AppShell} from './app-shell';
import {AddNeedSheet} from './add-need-sheet';

const mocks=vi.hoisted(()=>({api:vi.fn(),replace:vi.fn(),push:vi.fn(),search:'',pathname:'/en'}));
vi.mock('next/navigation',()=>({useParams:()=>({locale:'en'}),usePathname:()=>mocks.pathname,useSearchParams:()=>new URLSearchParams(mocks.search),useRouter:()=>({replace:mocks.replace,push:mocks.push})}));
vi.mock('@/lib/api',async importOriginal=>({...await importOriginal<typeof import('@/lib/api')>(),api:mocks.api}));
const me:SessionUser={id:'user',name:'Mouad',email:'demo@example.test',householdId:'home',householdName:'Family',preferredLocale:'en',role:'OWNER'};
const item=(id:string,status:Item['status'],category='food',usual=false):Item=>({id,name:id,visualKey:'custom',status,priority:'NORMAL',usual,updatedAt:'2026-10-15T10:00:00Z',updatedBy:{id:'user',name:'Mouad'},category:{id:category,name:category,key:category}});
const entries=[item('Milk','AVAILABLE'),item('Water','LOW','drinks'),item('Eggs','NEEDED')];
const categories=[{id:'food',name:'Food',key:'food'},{id:'drinks',name:'Drinks',key:'drinks'}];
beforeEach(()=>{
  mocks.api.mockReset();mocks.replace.mockReset();mocks.push.mockReset();mocks.search='';mocks.pathname='/en';
  mocks.api.mockImplementation((path:string)=>Promise.resolve(path==='/auth/me'?me:path==='/items'?entries:path==='/categories'?categories:path==='/shopping/active'?null:[]));
});

describe('household UX recovery',()=>{
  it('shows a retry state rather than a healthy empty home when items cannot load',async()=>{
    mocks.api.mockImplementation((path:string)=>path==='/items'?Promise.reject(new Error('offline')):Promise.resolve(path==='/auth/me'?me:[]));
    renderWithProviders(<HomePage/>);
    expect(await screen.findByText(/couldn't load this information/)).toBeVisible();
    expect(screen.queryByText(/Everything looks good/)).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Try again'})).toBeEnabled();
    mocks.api.mockImplementation((path:string)=>Promise.resolve(path==='/items'?entries:path==='/auth/me'?me:[]));
    fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    expect(await screen.findByRole('link',{name:'1 thing we need'})).toBeVisible();
  });
  it('retains the sign-in screen context on a temporary session lookup error',async()=>{
    mocks.api.mockRejectedValue(new ApiError('server unavailable',503));renderWithProviders(<AppShell>Private content</AppShell>);
    expect(await screen.findByRole('button',{name:'Try again'})).toBeEnabled();expect(mocks.replace).not.toHaveBeenCalled();
    mocks.api.mockResolvedValue(me);fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    expect(await screen.findByText('Private content')).toBeVisible();expect(mocks.replace).not.toHaveBeenCalled();
  });
  it('redirects an expired session to sign-in',async()=>{
    mocks.api.mockRejectedValue(new ApiError('expired',401));renderWithProviders(<AppShell>Private content</AppShell>);
    await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith('/en/welcome'));
  });
  it('links each dashboard summary to its matching status',async()=>{
    renderWithProviders(<HomePage/>);
    expect(await screen.findByRole('link',{name:'1 thing we need'})).toHaveAttribute('href','/en/needs?status=NEEDED');
    expect(screen.getByRole('link',{name:'1 almost finished'})).toHaveAttribute('href','/en/needs?status=LOW');
  });

  it('announces usual-item status and opens the matching status selector',async()=>{
    mocks.api.mockImplementation((path:string)=>Promise.resolve(path==='/items'?entries.map(entry=>({...entry,usual:true})):path==='/auth/me'?me:[]));
    renderWithProviders(<HomePage/>);
    expect(await screen.findByRole('button',{name:'Milk, We have it'})).toBeVisible();
    expect(screen.getByRole('button',{name:'Water, Almost finished'})).toBeVisible();
    const needed=screen.getByRole('button',{name:'Eggs, We need it'});
    expect(needed.querySelector('.usual-status')).toHaveAttribute('aria-hidden','true');
    fireEvent.click(needed);
    const dialog=screen.getByRole('dialog',{name:'Eggs'});
    expect(within(dialog).getByRole('button',{name:'We need it'})).toHaveAttribute('aria-pressed','true');
  });
});

describe('Needs filters and shopping',()=>{
  it('shows low items and distinguishes an empty category from an empty household',async()=>{
    mocks.search='status=LOW';renderWithProviders(<NeedsPage/>);
    expect(await screen.findByRole('button',{name:/Water.*Almost finished/})).toBeVisible();
    expect(screen.queryByRole('button',{name:/Eggs.*We need it/})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Food'}));
    expect(screen.getByText('No items match these filters')).toBeVisible();
    expect(screen.queryByText(/Everything looks good/)).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'I’m going shopping'})).toBeEnabled();
    fireEvent.click(screen.getAllByRole('button',{name:'Clear filters'})[0]);
    expect(mocks.replace).toHaveBeenCalledWith('/en/needs',{scroll:false});
  });
  it('falls back to all needs for an invalid status parameter',async()=>{
    mocks.search='status=INVALID';renderWithProviders(<NeedsPage/>);
    expect(await screen.findByRole('button',{name:/Water.*Almost finished/})).toBeVisible();
    expect(screen.getByRole('button',{name:/Eggs.*We need it/})).toBeVisible();
  });
  it('keeps the status filter when opening and closing Add',async()=>{
    mocks.search='status=LOW&add=1';mocks.pathname='/en/needs';
    const view=renderWithProviders(<NeedsPage/>);
    fireEvent.click(await screen.findByRole('button',{name:'Close'}));
    expect(mocks.replace).toHaveBeenCalledWith('/en/needs?status=LOW',{scroll:false});view.unmount();
    mocks.search='status=LOW';renderWithProviders(<AppShell>Needs</AppShell>);
    expect(await screen.findByRole('link',{name:'Add something'})).toHaveAttribute('href','/en/needs?status=LOW&add=1');
  });
  it('offers shopping when household needs exist instead of claiming there is nothing to buy',async()=>{
    renderWithProviders(<ShoppingPage/>);expect(await screen.findByText('Ready to go shopping?')).toBeVisible();
    await waitFor(()=>expect(screen.getByRole('button',{name:'Start shopping'})).toBeEnabled());
  });
});

describe('item selection',()=>{
  it('keeps every catalog item reachable and preserves search when going Back',async()=>{
    const catalog=Array.from({length:36},(_,index)=>item(`Household ${index}`,'AVAILABLE'));
    mocks.api.mockImplementation((path:string)=>Promise.resolve(path==='/items'?catalog:categories));
    renderWithProviders(<AddNeedSheet open onClose={()=>{}}/>);
    expect(await screen.findByRole('button',{name:'Household 35'})).toBeVisible();
    const search=screen.getByRole('textbox',{name:'Search'});fireEvent.change(search,{target:{value:'Household 35'}});
    fireEvent.click(screen.getByRole('button',{name:'Household 35'}));fireEvent.click(screen.getByRole('button',{name:'Back'}));
    expect(screen.getByRole('textbox',{name:'Search'})).toHaveValue('Household 35');
    expect(screen.getByRole('textbox',{name:'Search'})).toHaveFocus();
  });
  it('resets abandoned custom fields when Add is reopened',async()=>{
    const view=renderWithProviders(<AddNeedSheet open onClose={()=>{}}/>);
    fireEvent.click(screen.getByRole('button',{name:'Add something else'}));fireEvent.change(screen.getByLabelText('What is it?'),{target:{value:'Abandoned item'}});
    view.rerender(<AddNeedSheet open={false} onClose={()=>{}}/>);view.rerender(<AddNeedSheet open onClose={()=>{}}/>);
    fireEvent.click(screen.getByRole('button',{name:'Add something else'}));expect(screen.getByLabelText('What is it?')).toHaveValue('');
  });
  it('keeps the form and selected priority when saving fails so the user can retry',async()=>{
    mocks.api.mockImplementation((path:string,options?:RequestInit)=>options?.method?Promise.reject(new Error('offline')):Promise.resolve(path==='/items'?[{...entries[0],priority:'URGENT'}]:categories));
    const close=vi.fn();renderWithProviders(<AddNeedSheet open onClose={close}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Milk'}));
    expect(screen.getByRole('button',{name:'Urgent'})).toHaveAttribute('aria-pressed','true');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add'}));
    expect(await screen.findByRole('alert')).toHaveTextContent("That action didn't finish");expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'Try again'})).toBeEnabled();
    mocks.api.mockImplementation((path:string,options?:RequestInit)=>Promise.resolve(options?.method?{...entries[0],status:'NEEDED'}:path==='/items'?entries:categories));fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    await waitFor(()=>expect(close).toHaveBeenCalledOnce());
  });
});

describe('custom item icons',()=>{
  const openCustom=()=>fireEvent.click(screen.getByRole('button',{name:'Add something else'}));
  const choose=(name:string)=>{
    fireEvent.click(screen.getByRole('button',{name:'Choose icon'}));
    fireEvent.click(screen.getByRole('radio',{name}));
  };

  it('saves the chosen icon with the new item name, category, and priority',async()=>{
    const close=vi.fn();renderWithProviders(<AddNeedSheet open onClose={close}/>);openCustom();
    fireEvent.change(screen.getByLabelText('What is it?'),{target:{value:' Vitamins '}});
    await screen.findByRole('option',{name:'Food'});
    fireEvent.change(screen.getByLabelText('Category'),{target:{value:'food'}});
    fireEvent.click(screen.getByRole('button',{name:'Urgent'}));choose('Medicine');
    expect(screen.getAllByRole('radio')).toHaveLength(24);
    expect(screen.getByRole('radio',{name:'Medicine'})).toBeChecked();
    expect(screen.getByRole('radio',{name:'Basket'})).not.toBeChecked();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add'}));
    await waitFor(()=>expect(close).toHaveBeenCalledOnce());
    expect(mocks.api).toHaveBeenCalledWith('/items',expect.objectContaining({method:'POST',body:JSON.stringify({name:'Vitamins',visualKey:'medicine',categoryId:'food',priority:'URGENT'})}));
  });

  it('uses the default basket when the picker is left unchanged',async()=>{
    const close=vi.fn();renderWithProviders(<AddNeedSheet open onClose={close}/>);openCustom();
    fireEvent.change(screen.getByLabelText('What is it?'),{target:{value:'Cat food'}});
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add'}));
    await waitFor(()=>expect(close).toHaveBeenCalledOnce());
    const request=mocks.api.mock.calls.find(([,options])=>options?.method==='POST');
    expect(JSON.parse(request![1].body).visualKey).toBe('custom');
  });

  it('preserves the icon and draft after a failure and Back navigation',async()=>{
    mocks.api.mockImplementation((path:string,options?:RequestInit)=>options?.method?Promise.reject(new Error('offline')):Promise.resolve(path==='/items'?entries:categories));
    renderWithProviders(<AddNeedSheet open onClose={()=>{}}/>);openCustom();choose('Coffee');
    fireEvent.change(screen.getByLabelText('What is it?'),{target:{value:'Coffee filters'}});
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add'}));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('radio',{name:'Coffee'})).toBeChecked();
    fireEvent.click(screen.getByRole('button',{name:'Back'}));openCustom();
    expect(screen.getByLabelText('What is it?')).toHaveValue('Coffee filters');
    fireEvent.click(screen.getByRole('button',{name:'Choose icon'}));
    expect(screen.getByRole('radio',{name:'Coffee'})).toBeChecked();
    mocks.api.mockImplementation((path:string,options?:RequestInit)=>Promise.resolve(options?.method?{id:'created'}:path==='/items'?entries:categories));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add'}));
    await waitFor(()=>expect(mocks.api.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(2));
    const requests=mocks.api.mock.calls.filter(([,options])=>options?.method==='POST');
    expect(requests.every(([,options])=>JSON.parse(options.body).visualKey==='coffee')).toBe(true);
  });

  it('resets the icon after closing and reopening the sheet',()=>{
    const view=renderWithProviders(<AddNeedSheet open onClose={()=>{}}/>);openCustom();choose('Light');
    view.rerender(<AddNeedSheet open={false} onClose={()=>{}}/>);view.rerender(<AddNeedSheet open onClose={()=>{}}/>);openCustom();
    fireEvent.click(screen.getByRole('button',{name:'Choose icon'}));
    expect(screen.getByRole('radio',{name:'Basket'})).toBeChecked();
    expect(screen.getByRole('radio',{name:'Light'})).not.toBeChecked();
  });

  it('disables icon changes while the item is being saved',async()=>{
    let resolve!:(value:unknown)=>void;
    mocks.api.mockImplementation((path:string,options?:RequestInit)=>options?.method?new Promise(yes=>{resolve=yes;}):Promise.resolve(path==='/items'?entries:categories));
    renderWithProviders(<AddNeedSheet open onClose={()=>{}}/>);openCustom();choose('Water');
    fireEvent.change(screen.getByLabelText('What is it?'),{target:{value:'Sparkling water'}});
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add'}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Hide icons'})).toBeDisabled());
    expect(screen.getByRole('radio',{name:'Water'})).toBeDisabled();
    expect(screen.getByRole('radio',{name:'Basket'})).toBeDisabled();
    resolve({id:'created'});
    await waitFor(()=>expect(screen.getByRole('button',{name:'Hide icons'})).toBeEnabled());
  });
});

describe('shopping mutation failures',()=>{
  const trip=(purchased:boolean)=>({id:'trip',status:'ACTIVE',shopper:{id:'user',name:'Mouad'},items:[{id:'trip-item',purchased,item:entries[1]}]});
  it('keeps an unchecked item visible when marking it purchased fails',async()=>{
    mocks.api.mockImplementation((path:string,options?:RequestInit)=>options?.method?Promise.reject(new Error('offline')):Promise.resolve(path==='/shopping/active'?trip(false):entries));
    renderWithProviders(<ShoppingPage/>);fireEvent.click(await screen.findByRole('checkbox',{name:'Water'}));
    expect(await screen.findByRole('alert')).toHaveTextContent("That action didn't finish");
    expect(screen.getByRole('checkbox',{name:'Water'})).not.toBeChecked();expect(mocks.replace).not.toHaveBeenCalled();
  });
  it('keeps the active trip available for retry when finishing fails',async()=>{
    mocks.api.mockImplementation((path:string,options?:RequestInit)=>options?.method?Promise.reject(new Error('offline')):Promise.resolve(path==='/shopping/active'?trip(true):entries));
    renderWithProviders(<ShoppingPage/>);fireEvent.click(await screen.findByRole('button',{name:'Finish shopping'}));
    expect(await screen.findByRole('alert')).toHaveTextContent("That action didn't finish");
    expect(screen.getByRole('button',{name:'Try again'})).toBeEnabled();expect(mocks.replace).not.toHaveBeenCalled();
  });
});

describe('accounts and invitations without email delivery',()=>{
  it('signs in immediately after registration and opens the home route',async()=>{
    const {default:RegisterPage}=await import('@/app/[locale]/register/page');
    mocks.api.mockResolvedValue({preferredLocale:'en'});
    renderWithProviders(<RegisterPage/>);
    fireEvent.change(screen.getByLabelText('Your name'),{target:{value:'Mouad'}});
    fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'mouad@example.test'}});
    fireEvent.change(screen.getByLabelText('Password'),{target:{value:'secure-password'}});
    fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'secure-password'}});
    fireEvent.click(screen.getByRole('button',{name:'Create account'}));
    await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith('/en'));
    expect(mocks.api).toHaveBeenCalledWith('/auth/register',expect.objectContaining({method:'POST'}));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/confirm your email/i)).not.toBeInTheDocument();
  });

  it('creates a copyable family invitation link and shows a manual fallback on copy failure',async()=>{
    const {default:FamilyPage}=await import('@/app/[locale]/(app)/family/page');
    const url='https://darna.example/en/invite/private-token';
    const copy=vi.fn().mockRejectedValue(new Error('clipboard unavailable'));
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:copy}});
    mocks.api.mockImplementation((path:string)=>Promise.resolve(path==='/auth/me'?me:path==='/households/family'?{name:'Family',members:[],invitations:[]}:{invitationUrl:url}));
    renderWithProviders(<FamilyPage/>);
    fireEvent.click(await screen.findByRole('button',{name:'Invite family member'}));
    fireEvent.change(screen.getByLabelText('Their name'),{target:{value:'Fatima'}});
    fireEvent.change(screen.getByLabelText('Their email'),{target:{value:'fatima@example.test'}});
    fireEvent.click(screen.getByRole('button',{name:'Create invitation link'}));
    expect(await screen.findByRole('textbox',{name:'Invitation link'})).toHaveValue(url);
    fireEvent.click(screen.getByRole('button',{name:'Copy link'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Select the link above and copy it');
    copy.mockResolvedValue(undefined);fireEvent.click(screen.getByRole('button',{name:'Copy link'}));
    expect(await screen.findByRole('button',{name:'Link copied'})).toBeVisible();
    expect(copy).toHaveBeenCalledWith(url);
  });

  it('makes the refreshed link visible for an existing pending invitation',async()=>{
    const {default:FamilyPage}=await import('@/app/[locale]/(app)/family/page');
    const url='https://darna.example/en/invite/new-private-token';
    mocks.api.mockImplementation((path:string)=>Promise.resolve(path==='/auth/me'?me:path==='/households/family'?{name:'Family',members:[],invitations:[{id:'i',invitedName:'Fatima',invitedEmail:'f@example.test'}]}:{invitationUrl:url}));
    renderWithProviders(<FamilyPage/>);
    fireEvent.click(await screen.findByRole('button',{name:'New link'}));
    expect(await screen.findByRole('textbox',{name:'Invitation link'})).toHaveValue(url);
    expect(mocks.api).toHaveBeenCalledWith('/invitations/i/link',{method:'POST'});
  });
});
