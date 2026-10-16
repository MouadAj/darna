import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import {renderWithProviders} from '@/test-utils';
import type {Item, ShoppingTrip} from '@/lib/types';
import {ItemDetailSheet, ItemDetailsFields} from './item-details';
import {AddNeedSheet} from './add-need-sheet';
import HomePage from '@/app/[locale]/(app)/page';
import NeedsPage from '@/app/[locale]/(app)/needs/page';
import ShoppingPage from '@/app/[locale]/(app)/shopping/page';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import ar from '../../messages/ar.json';
const mocks=vi.hoisted(()=>({api:vi.fn()}));
vi.mock('@/lib/api',()=>({api:mocks.api}));
vi.mock('next/navigation',()=>({useParams:()=>({locale:'en'}),useSearchParams:()=>new URLSearchParams(),useRouter:()=>({replace:vi.fn(),push:vi.fn()})}));
const initial:Item={id:'milk',name:'Milk',visualKey:'milk',quantity:'2 bottles',notes:'Unsweetened',status:'NEEDED',priority:'NORMAL',usual:true,updatedAt:'2026-10-16T12:00:00Z',category:null,updatedBy:{id:'user',name:'Mouad'}};
let saved:Item;
const trip=():ShoppingTrip=>({id:'trip',status:'ACTIVE',shopper:{id:'user',name:'Mouad'},items:[{id:'purchase',purchased:false,item:saved}]});
beforeEach(()=>{
  saved={...initial}; mocks.api.mockReset();
  mocks.api.mockImplementation((path:string,options?:RequestInit)=>{
    if(options?.method==='PATCH'&&path==='/items/milk'){saved={...saved,...JSON.parse(options.body as string)};return Promise.resolve(saved);}
    return Promise.resolve(path==='/items'?[saved]:path==='/shopping/active'?trip():path==='/auth/me'?{name:'Mouad',householdName:'Darna'}:[]);
  });
});
const quantity=()=>screen.getByRole('textbox',{name:'Quantity (optional)'});
const note=()=>screen.getByRole('textbox',{name:'Note (optional)'});

describe('item detail editor',()=>{
  it('isolates editing from status controls, cancels without saving, and prefills saved values again',()=>{
    renderWithProviders(<ItemDetailSheet item={saved} onClose={()=>{}}/>);
    fireEvent.click(screen.getByRole('button',{name:'Edit details'}));
    expect(quantity()).toHaveValue('2 bottles');expect(note()).toHaveValue('Unsweetened');
    expect(screen.queryByRole('button',{name:'We have it'})).not.toBeInTheDocument();
    fireEvent.change(quantity(),{target:{value:'3 packs'}});
    fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
    expect(screen.getByRole('button',{name:'We have it'})).toBeVisible();
    expect(mocks.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Edit details'}));expect(quantity()).toHaveValue('2 bottles');
  });
  it('preserves failed drafts, retries, updates both caches, and confirms success',async()=>{
    const close=vi.fn();const view=renderWithProviders(<ItemDetailSheet item={saved} onClose={close} editOnly/>);
    view.client.setQueryData(['items'],[saved]);view.client.setQueryData(['shopping','active'],trip());
    mocks.api.mockRejectedValueOnce(new Error('offline'));
    fireEvent.change(quantity(),{target:{value:'  500 g  '}});fireEvent.change(note(),{target:{value:'  Fresh\nplease  '}});
    fireEvent.click(screen.getByRole('button',{name:'Save'}));
    expect(await screen.findByRole('alert')).toBeVisible();expect(quantity()).toHaveValue('  500 g  ');expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    await waitFor(()=>expect(close).toHaveBeenCalledOnce());
    expect(view.client.getQueryData<Item[]>(['items'])?.[0]).toMatchObject({quantity:'500 g',notes:'Fresh\nplease'});
    expect(view.client.getQueryData<ShoppingTrip>(['shopping','active'])?.items[0].item.quantity).toBe('500 g');
    expect(screen.getByRole('status')).toHaveTextContent('Quantity and note saved');
  });
  it('clears empty details explicitly and blocks duplicate saves and dismissal while pending',async()=>{
    let resolve!:(value:Item)=>void;const close=vi.fn();mocks.api.mockImplementation(()=>new Promise(yes=>{resolve=yes;}));
    renderWithProviders(<ItemDetailSheet item={saved} onClose={close} editOnly/>);
    fireEvent.change(quantity(),{target:{value:''}});fireEvent.change(note(),{target:{value:'  '}});
    const button=screen.getByRole('button',{name:'Save'});fireEvent.click(button);fireEvent.click(button);
    await waitFor(()=>expect(mocks.api).toHaveBeenCalledOnce());
    expect(JSON.parse(mocks.api.mock.calls[0][1].body)).toEqual({quantity:null,notes:null});
    expect(quantity()).toBeDisabled();expect(screen.getByRole('button',{name:'Cancel'})).toBeDisabled();expect(screen.getByRole('button',{name:'Close'})).toBeDisabled();
    fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));expect(close).not.toHaveBeenCalled();
    resolve({...saved,quantity:null,notes:null});await waitFor(()=>expect(close).toHaveBeenCalledOnce());
  });
});

describe('details in household flows',()=>{
  it.each([['dashboard',HomePage],['Needs',NeedsPage],['Shopping',ShoppingPage]] as const)('shows saved details on %s as plain text',async(_name,Page)=>{
    saved.notes='<img src=x onerror=alert(1)>\nUsual brand';
    const view=renderWithProviders(<Page/>);
    expect(await screen.findByText('2 bottles')).toBeVisible();expect(screen.getByText(/<img src=x/)).toBeVisible();expect(view.container.querySelector('img[src="x"]')).toBeNull();
  });
  it('edits Shopping details separately from purchase and refreshes the list after save',async()=>{
    renderWithProviders(<ShoppingPage/>);
    fireEvent.click(await screen.findByRole('button',{name:'Edit details · Milk'}));
    expect(screen.getByRole('checkbox',{name:'Milk'})).not.toBeChecked();expect(screen.getByRole('checkbox',{name:'Milk'})).toBeDisabled();
    fireEvent.change(note(),{target:{value:'The usual brand'}});fireEvent.click(screen.getByRole('button',{name:'Save'}));
    expect(await screen.findByText('The usual brand',{selector:'p'})).toBeVisible();expect(screen.getByRole('checkbox',{name:'Milk'})).not.toBeChecked();
    expect(mocks.api.mock.calls.filter(([,options])=>options?.method)).toHaveLength(1);
  });
  it('prefills existing details when adding to Needs and supports clearing them',async()=>{
    const close=vi.fn();renderWithProviders(<AddNeedSheet open onClose={close}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Milk'}));expect(quantity()).toHaveValue('2 bottles');
    fireEvent.change(quantity(),{target:{value:''}});fireEvent.change(note(),{target:{value:''}});
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add'}));
    await waitFor(()=>expect(close).toHaveBeenCalledOnce());
    expect(JSON.parse(mocks.api.mock.calls.find(([,options])=>options?.method)![1].body)).toEqual({status:'NEEDED',priority:'NORMAL',quantity:'',notes:''});
  });
  it('creates custom items with optional details and preserves them on failure',async()=>{
    const close=vi.fn();renderWithProviders(<AddNeedSheet open onClose={close}/>);
    fireEvent.click(screen.getByRole('button',{name:'Add something else'}));
    expect(screen.getByRole('button',{name:'Quantity & note'})).toHaveAttribute('aria-expanded','false');
    fireEvent.click(screen.getByRole('button',{name:'Quantity & note'}));
    fireEvent.change(screen.getByLabelText('What is it?'),{target:{value:'Coffee'}});fireEvent.change(quantity(),{target:{value:'a small pack'}});fireEvent.change(note(),{target:{value:'Ground'}});
    mocks.api.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add'}));
    expect(await screen.findByRole('alert')).toBeVisible();expect(quantity()).toHaveValue('a small pack');expect(note()).toHaveValue('Ground');
    mocks.api.mockResolvedValueOnce({...saved,name:'Coffee'});fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    await waitFor(()=>expect(close).toHaveBeenCalledOnce());
    expect(JSON.parse(mocks.api.mock.calls.find(([,options])=>options?.method)![1].body)).toMatchObject({name:'Coffee',quantity:'a small pack',notes:'Ground'});
  });
  it.each([['en',en],['fr',fr],['ar',ar]] as const)('localizes fields and limits in %s', (locale,messages)=>{
    renderWithProviders(<NextIntlClientProvider locale={locale} messages={messages}><ItemDetailsFields quantity="" notes="" onChange={()=>{}} expanded/></NextIntlClientProvider>);
    expect(screen.getByRole('button',{name:messages.itemDetails.section})).toBeVisible();
    const fields=screen.getAllByRole('textbox');expect(fields[0]).toHaveAttribute('maxlength','60');expect(fields[1]).toHaveAttribute('maxlength','500');expect(fields.every(field=>field.dir==='auto')).toBe(true);
  });
});
