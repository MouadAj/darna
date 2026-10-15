'use client';
import {Check, ShoppingBasket} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useParams, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {api} from '@/lib/api';
import type {ShoppingTrip} from '@/lib/types';
import {ItemVisual} from '@/components/item-visual';
import {useToast} from '@/components/toast';
import {EmptyState, ErrorState, LoadingState, PageHeader, PriorityBadge} from '@/components/ui';

export default function ShoppingPage(){
  const t=useTranslations('shopping');const {locale}=useParams<{locale:string}>();const router=useRouter();const client=useQueryClient();const toast=useToast();
  const trip=useQuery({queryKey:['shopping','active'],queryFn:()=>api<ShoppingTrip|null>('/shopping/active')});
  const start=useMutation({mutationFn:()=>api<ShoppingTrip>('/shopping/start',{method:'POST'}),onSuccess:data=>client.setQueryData(['shopping','active'],data)});
  const toggle=useMutation({mutationFn:(id:string)=>api(`/shopping/items/${id}/toggle`,{method:'PATCH'}),onSuccess:()=>void client.invalidateQueries({queryKey:['shopping','active']})});
  const finish=useMutation({mutationFn:()=>api(`/shopping/${trip.data!.id}/finish`,{method:'POST'}),onSuccess:()=>{void client.invalidateQueries({queryKey:['items']});toast.show(t('finished'));router.replace(`/${locale}/needs`);}});
  if(trip.isLoading)return <div className="list-workspace"><PageHeader title={t('title')} backHref={`/${locale}/needs`}/><LoadingState rows={5}/></div>;
  if(trip.isError)return <ErrorState message={trip.error.message} retry={()=>trip.refetch()}/>;
  if(!trip.data)return <div className="list-workspace"><PageHeader title={t('title')} backHref={`/${locale}/needs`}/><EmptyState icon={<ShoppingBasket/>} title={t('empty')} body={t('emptyBody')} action={<button className="button" disabled={start.isPending} onClick={()=>start.mutate()}>{t('start')}</button>}/>{start.isError&&<p className="field-error">{start.error.message}</p>}</div>;
  const left=trip.data.items.filter(entry=>!entry.purchased).length;const done=trip.data.items.length-left;const progress=trip.data.items.length?done/trip.data.items.length*100:0;
  return <div className="list-workspace"><PageHeader title={t('title')} subtitle={t('startedBy',{name:trip.data.shopper.name})} backHref={`/${locale}/needs`}/><h2 className="shopping-count">{t('left',{count:left})}</h2><div className="progress-track" aria-label={`${Math.round(progress)}%`}><span style={{width:`${progress}%`}}/></div><div className="item-list">{trip.data.items.map(entry=><div className={`shopping-row ${entry.purchased?'checked':''}`} key={entry.id}><button className={`shop-check ${entry.purchased?'checked':''}`} aria-label={entry.purchased?t('purchased'):t('notPurchased')} disabled={toggle.isPending} onClick={()=>toggle.mutate(entry.id)}>{entry.purchased&&<Check/>}</button><ItemVisual visualKey={entry.item.visualKey} size="sm"/><div className="item-row-main"><h3>{entry.item.name}</h3><PriorityBadge priority={entry.item.priority}/></div></div>)}</div><div className="shopping-bar"><button className="button full" disabled={finish.isPending||done===0} onClick={()=>finish.mutate()}><Check/>{finish.isPending?'…':t('finish')}</button></div></div>;
}
