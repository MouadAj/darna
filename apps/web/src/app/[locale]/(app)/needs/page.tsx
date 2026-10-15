'use client';
import {CircleCheckBig, ShoppingBasket} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Suspense, useMemo, useState} from 'react';
import type {ItemStatus} from '@housefamily/shared';
import {api} from '@/lib/api';
import type {Category, Item, ShoppingTrip} from '@/lib/types';
import {AddNeedSheet} from '@/components/add-need-sheet';
import {ItemVisual} from '@/components/item-visual';
import {StatusSelector} from '@/components/status-selector';
import {useToast} from '@/components/toast';
import {EmptyState, ErrorState, LoadingState, PageHeader, PriorityBadge, Sheet, StatusBadge} from '@/components/ui';

function NeedsContent() {
  const t=useTranslations('needs'); const statusT=useTranslations('status'); const {locale}=useParams<{locale:string}>(); const searchParams=useSearchParams(); const router=useRouter(); const client=useQueryClient(); const toast=useToast();
  const [category,setCategory]=useState('all'); const [selected,setSelected]=useState<Item|null>(null); const addOpen=searchParams.get('add')==='1';
  const items=useQuery({queryKey:['items'],queryFn:()=>api<Item[]>('/items')}); const categories=useQuery({queryKey:['categories'],queryFn:()=>api<Category[]>('/categories')});
  const visible=useMemo(()=>(items.data??[]).filter(item=>item.status!=='AVAILABLE'&&(category==='all'||item.category?.key===category)),[items.data,category]);
  const update=useMutation({mutationFn:(value:ItemStatus)=>api<Item>(`/items/${selected!.id}`,{method:'PATCH',body:JSON.stringify({status:value})}),onSuccess:item=>{client.setQueryData<Item[]>(['items'],old=>old?.map(entry=>entry.id===item.id?item:entry));toast.show(statusT(item.status));setSelected(null);}});
  const start=useMutation({mutationFn:()=>api<ShoppingTrip>('/shopping/start',{method:'POST'}),onSuccess:()=>router.push(`/${locale}/shopping`)});
  const closeAdd=()=>router.replace(`/${locale}/needs`);
  return <div className="list-workspace"><PageHeader title={t('title')} subtitle={t('subtitle')}/><div className="chip-scroll"><button className={`chip ${category==='all'?'active':''}`} onClick={()=>setCategory('all')}>{t('all')}</button>{categories.data?.map(entry=><button key={entry.id} className={`chip ${category===entry.key?'active':''}`} onClick={()=>setCategory(entry.key)}>{entry.name}</button>)}</div>
    {items.isLoading?<LoadingState rows={5}/>:items.isError?<ErrorState message={items.error.message} retry={()=>items.refetch()}/>:visible.length?<div className="item-list">{visible.map(item=><button className="item-row item-row-button" key={item.id} onClick={()=>setSelected(item)}><ItemVisual visualKey={item.visualKey}/><div className="item-row-main"><h3>{item.name}</h3><div className="item-meta"><span>{t('updatedBy',{status:statusT(item.status),name:item.updatedBy.name})}</span><PriorityBadge priority={item.priority}/></div></div><StatusBadge status={item.status}/></button>)}</div>:<EmptyState icon={<CircleCheckBig/>} title={t('empty')} body={t('emptyBody')}/>}
    <div className="shopping-bar"><button className="button full" disabled={start.isPending||visible.length===0} onClick={()=>start.mutate()}><ShoppingBasket/>{start.isPending?'…':t('shopping')}</button>{start.isError&&<p className="field-error">{start.error.message}</p>}</div>
    <Sheet open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected?.name??''}>{selected&&<><div className="selected-item"><ItemVisual visualKey={selected.visualKey} size="lg"/><StatusBadge status={selected.status}/></div><StatusSelector value={selected.status} disabled={update.isPending} onChange={value=>update.mutate(value)}/></>}</Sheet><AddNeedSheet open={addOpen} onClose={closeAdd}/>
  </div>;
}
export default function NeedsPage(){return <Suspense><NeedsContent/></Suspense>}
