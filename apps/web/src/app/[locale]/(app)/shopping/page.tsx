'use client';
import {Check, ShoppingBasket} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useParams, useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {api} from '@/lib/api';
import {PageSkeleton, PendingLabel, RefreshIndicator, Spinner} from '@/components/loading';
import type {Item, ShoppingTrip} from '@/lib/types';
import {ItemVisual} from '@/components/item-visual';
import {useToast} from '@/components/toast';
import {ActionError, EmptyState, ErrorState, PageHeader, PriorityBadge} from '@/components/ui';

export default function ShoppingPage(){
  const t=useTranslations('shopping');const common=useTranslations('common');const {locale}=useParams<{locale:string}>();const router=useRouter();const client=useQueryClient();const toast=useToast();
  const trip=useQuery({queryKey:['shopping','active'],queryFn:()=>api<ShoppingTrip|null>('/shopping/active')});
  const items=useQuery({queryKey:['items'],queryFn:()=>api<Item[]>('/items'),enabled:trip.isSuccess&&!trip.data});
  const hasNeeds=items.data?.some(item=>item.status!=='AVAILABLE')??false;
  const start=useMutation({mutationFn:()=>api<ShoppingTrip>('/shopping/start',{method:'POST'}),onSuccess:data=>{client.setQueryData(['shopping','active'],data);void client.invalidateQueries({queryKey:['activity']});}});
  const toggle=useMutation({mutationFn:(id:string)=>api(`/shopping/items/${id}/toggle`,{method:'PATCH'}),onSuccess:()=>{void client.invalidateQueries({queryKey:['shopping','active']});void client.invalidateQueries({queryKey:['activity']});}});
  const finish=useMutation({mutationFn:()=>api(`/shopping/${trip.data!.id}/finish`,{method:'POST'}),onSuccess:()=>{void client.invalidateQueries({queryKey:['items']});client.setQueryData(['shopping','active'],null);void client.invalidateQueries({queryKey:['activity']});toast.show(t('finished'));router.replace(`/${locale}/needs`);}});
  if(trip.isPending||(trip.data===null&&items.isPending))return <PageSkeleton variant="shopping"/>;
  if(trip.isError&&trip.data===undefined)return <ErrorState message={common('loadFailed')} retry={()=>trip.refetch()}/>;
  if(!trip.data&&items.isError&&!items.data)return <ErrorState message={common('loadFailed')} retry={()=>void items.refetch()}/>;
  if(!trip.data)return <div className="list-workspace" aria-busy={trip.isFetching||items.isFetching}><RefreshIndicator active={trip.isFetching||items.isFetching}/>{trip.isError&&<ActionError message={common('loadFailed')} retry={()=>void trip.refetch()} pending={trip.isFetching}/>}<PageHeader title={t('title')} backHref={`/${locale}/needs`}/><EmptyState icon={<ShoppingBasket/>} title={t(items.isSuccess&&!hasNeeds?'empty':'readyTitle')} body={t(items.isSuccess&&!hasNeeds?'emptyBody':'readyBody')} action={<button className="button" disabled={start.isPending||!items.isSuccess||!hasNeeds} onClick={()=>start.mutate()}><PendingLabel pending={start.isPending}>{start.isPending?common('starting'):t('start')}</PendingLabel></button>}/>{items.isError&&<ActionError message={common('loadFailed')} retry={()=>void items.refetch()} pending={items.isFetching}/ >}{start.isError&&<ActionError retry={()=>start.mutate()}/ >}</div>;
  const left=trip.data.items.filter(entry=>!entry.purchased).length;const done=trip.data.items.length-left;const progress=trip.data.items.length?done/trip.data.items.length*100:0;
  return <div className="list-workspace" aria-busy={trip.isFetching||items.isFetching}><RefreshIndicator active={trip.isFetching||items.isFetching}/>{trip.isError&&<ActionError message={common('loadFailed')} retry={()=>void trip.refetch()} pending={trip.isFetching}/>}<PageHeader title={t('title')} subtitle={t('startedBy',{name:trip.data.shopper.name})} backHref={`/${locale}/needs`}/><h2 className="shopping-count">{t('left',{count:left})}</h2><div className="progress-track" role="progressbar" aria-label={t('progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={t('left',{count:left})}><span style={{width:`${progress}%`}}/></div><div className="item-list">{trip.data.items.map(entry=><div className={`shopping-row ${entry.purchased?'checked':''}`} key={entry.id}><button className={`shop-check ${entry.purchased?'checked':''}`} role="checkbox" aria-checked={entry.purchased} aria-label={entry.item.name} disabled={toggle.isPending} onClick={()=>toggle.mutate(entry.id)}>{toggle.isPending&&toggle.variables===entry.id?<Spinner/>:entry.purchased&&<Check/>}</button><ItemVisual visualKey={entry.item.visualKey} size="sm"/><div className="item-row-main"><h3>{entry.item.name}</h3><PriorityBadge priority={entry.item.priority}/></div></div>)}</div>{toggle.isError&&<ActionError retry={()=>toggle.mutate(toggle.variables!)}/>}<div className="shopping-bar"><button className="button full" disabled={finish.isPending||done===0} onClick={()=>finish.mutate()}><PendingLabel pending={finish.isPending}>{finish.isPending?common('finishing'):t('finish')}</PendingLabel></button>{finish.isError&&<ActionError retry={()=>finish.mutate()}/>}</div></div>;
}
