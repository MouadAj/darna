'use client';
import {CircleCheckBig, ShoppingBasket} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Suspense, useMemo, useState} from 'react';
import {api} from '@/lib/api';
import {PageSkeleton, PendingLabel, RefreshIndicator} from '@/components/loading';
import {needsHref, readNeedsStatus, type NeedsStatus} from '@/lib/needs-filters';
import type {Category, Item, ShoppingTrip} from '@/lib/types';
import {AddNeedSheet} from '@/components/add-need-sheet';
import {ItemVisual} from '@/components/item-visual';
import {ItemDetails, ItemDetailSheet} from '@/components/item-details';
import {ActionError, EmptyState, ErrorState, PageHeader, PriorityBadge, StatusBadge} from '@/components/ui';

function NeedsContent() {
  const t=useTranslations('needs'); const common=useTranslations('common'); const statusT=useTranslations('status');
  const {locale}=useParams<{locale:string}>(); const searchParams=useSearchParams(); const router=useRouter(); const client=useQueryClient();
  const [category,setCategory]=useState('all'); const [selected,setSelected]=useState<Item|null>(null);
  const addOpen=searchParams.get('add')==='1'; const status=readNeedsStatus(searchParams.get('status'));
  const items=useQuery({queryKey:['items'],queryFn:()=>api<Item[]>('/items')});
  const categories=useQuery({queryKey:['categories'],queryFn:()=>api<Category[]>('/categories')});
  const outstanding=useMemo(()=>(items.data??[]).filter(item=>item.status!=='AVAILABLE'),[items.data]);
  const visible=outstanding.filter(item=>(!status||item.status===status)&&(category==='all'||item.category?.key===category));
  const start=useMutation({mutationFn:()=>api<ShoppingTrip>('/shopping/start',{method:'POST'}),onSuccess:data=>{
    client.setQueryData(['shopping','active'],data);void client.invalidateQueries({queryKey:['activity']});router.push(`/${locale}/shopping`);
  }});
  const setStatus=(value:NeedsStatus|null)=>router.replace(needsHref(locale,searchParams.toString(),{status:value}),{scroll:false});
  const closeAdd=()=>router.replace(needsHref(locale,searchParams.toString(),{add:false}),{scroll:false});
  const clearFilters=()=>{setCategory('all');setStatus(null);};
  const filtered=status!==null||category!=='all';
  if(items.isPending)return <PageSkeleton variant="needs"/>;
  return <div className="list-workspace" aria-busy={items.isFetching}><RefreshIndicator active={items.isFetching||categories.isFetching}/><PageHeader title={t('title')} subtitle={t('subtitle')}/>
    <div className="needs-status-filters" role="group" aria-label={common('itemStatus')}>{([null,'NEEDED','LOW'] as const).map(value=><button type="button" key={value??'all'} aria-pressed={status===value} onClick={()=>setStatus(value)}>{value?statusT(value):t('allNeeds')}</button>)}</div>
    <div className="chip-scroll" role="group" aria-label={t('category')}><button type="button" className={`chip ${category==='all'?'active':''}`} aria-pressed={category==='all'} onClick={()=>setCategory('all')}>{t('all')}</button>{categories.data?.map(entry=><button type="button" key={entry.id} className={`chip ${category===entry.key?'active':''}`} aria-pressed={category===entry.key} onClick={()=>setCategory(entry.key)}>{entry.name}</button>)}</div>
    {filtered&&<button type="button" className="text-button needs-clear-filters" onClick={clearFilters}>{t('clearFilters')}</button>}
    {items.isError&&items.data&&<ActionError message={common('loadFailed')} retry={()=>void items.refetch()} pending={items.isFetching}/>}
    {categories.isError&&<ActionError message={common('loadFailed')} retry={()=>void categories.refetch()} pending={categories.isFetching}/>}
    {items.isError&&!items.data?<ErrorState message={common('loadFailed')} retry={()=>void items.refetch()}/>:visible.length?<div className="item-list">{visible.map(item=><button type="button" className="item-row item-row-button" key={item.id} onClick={()=>{setSelected(item);}}><ItemVisual visualKey={item.visualKey}/><div className="item-row-main"><div className="item-name-details"><h3>{item.name}</h3><ItemDetails quantity={item.quantity} notes={item.notes}/></div><div className="item-meta"><span>{t('updatedBy',{status:statusT(item.status),name:item.updatedBy.name})}</span><PriorityBadge priority={item.priority}/></div></div><StatusBadge status={item.status}/></button>)}</div>:<EmptyState icon={<CircleCheckBig aria-hidden="true"/>} title={filtered?t('filteredEmpty'):t('empty')} body={filtered?t('filteredEmptyBody'):t('emptyBody')} action={filtered?<button type="button" className="button secondary" onClick={clearFilters}>{t('clearFilters')}</button>:undefined}/>}
    <div className="shopping-bar"><button type="button" className="button full" disabled={start.isPending||!items.isSuccess||outstanding.length===0} onClick={()=>start.mutate()}><ShoppingBasket aria-hidden="true"/><PendingLabel pending={start.isPending}>{start.isPending?common('starting'):t('shopping')}</PendingLabel></button>{start.isError&&<ActionError retry={()=>start.mutate()}/>}</div>
    <ItemDetailSheet item={selected} onClose={()=>setSelected(null)}/>
    <AddNeedSheet open={addOpen} onClose={closeAdd}/>
  </div>;
}
export default function NeedsPage(){return <Suspense fallback={<PageSkeleton variant="needs"/>}><NeedsContent/></Suspense>}
