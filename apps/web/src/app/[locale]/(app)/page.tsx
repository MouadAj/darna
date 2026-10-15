'use client';
import {AlertCircle, Clock3, Plus, Wrench} from 'lucide-react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import type {ItemStatus} from '@housefamily/shared';
import {api} from '@/lib/api';
import {PageSkeleton, RefreshIndicator} from '@/components/loading';
import type {HomeIssue, Item, SessionUser} from '@/lib/types';
import {ItemVisual} from '@/components/item-visual';
import {StatusSelector} from '@/components/status-selector';
import {ActionError, EmptyState, ErrorState, PriorityBadge, Sheet, StatusBadge} from '@/components/ui';
import {useToast} from '@/components/toast';

export default function HomePage() {
  const t=useTranslations('home'); const common=useTranslations('common'); const s=useTranslations('status'); const {locale}=useParams<{locale:string}>(); const client=useQueryClient(); const toast=useToast(); const [selected,setSelected]=useState<Item|null>(null);
  const me=useQuery({queryKey:['me'],queryFn:()=>api<SessionUser>('/auth/me')});
  const items=useQuery({queryKey:['items'],queryFn:()=>api<Item[]>('/items')});
  const issues=useQuery({queryKey:['issues'],queryFn:()=>api<HomeIssue[]>('/home-issues')});
  const update=useMutation({mutationFn:(status:ItemStatus)=>api<Item>(`/items/${selected!.id}`,{method:'PATCH',body:JSON.stringify({status})}),onSuccess:item=>{client.setQueryData<Item[]>(['items'],old=>old?.map(entry=>entry.id===item.id?item:entry));void client.invalidateQueries({queryKey:['activity']});toast.show(s(item.status));setSelected(null);}});
  const hour=new Date().getHours(); const greeting=hour<12?'morning':hour<18?'afternoon':'evening'; const data=items.data??[]; const needed=data.filter(item=>item.status==='NEEDED'); const low=data.filter(item=>item.status==='LOW'); const usual=data.filter(item=>item.usual).slice(0,6);
  if(items.isPending)return <PageSkeleton variant="dashboard"/>;
  return <><RefreshIndicator active={items.isFetching||issues.isFetching}/>{items.isError&&items.data&&<ActionError message={common('loadFailed')} retry={()=>void items.refetch()} pending={items.isFetching}/>}<header className="page-header home-header"><p className="eyebrow">{me.data?.householdName}</p><h1>{t(greeting,{name:me.data?.name??''})} <span aria-hidden="true">👋</span></h1></header>
    <div className="home-dashboard" aria-busy={items.isFetching||issues.isFetching}>{items.isError&&!items.data?<div className="home-data-error"><ErrorState message={common('loadFailed')} retry={()=>void items.refetch()}/></div>:<div className="summary-grid"><Link href={`/${locale}/needs?status=NEEDED`} className="summary-pill needed"><AlertCircle/>{t('neededCount',{count:needed.length})}</Link><Link href={`/${locale}/needs?status=LOW`} className="summary-pill low"><Clock3/>{t('lowCount',{count:low.length})}</Link></div>}
    <section className="hero-action"><h2>{t('question')}</h2><Link className="button" href={`/${locale}/needs?add=1`}><Plus/>{t('addSomething')}</Link></section>
    <section className="home-usual"><div className="section-heading"><h2>⭐ {t('usual')}</h2></div>{items.isError&&!items.data?null:<div className="usual-grid">{usual.map(item=><button key={item.id} className="usual-card" data-status={item.status} onClick={()=>{update.reset();setSelected(item);}}><span className="status-dot"/><ItemVisual visualKey={item.visualKey}/><span>{item.name}</span></button>)}</div>}<p className="form-hint">{t('tapHint')}</p></section>
    <section className="home-needed"><div className="section-heading"><h2>🔴 {t('weNeed')}</h2><Link href={`/${locale}/needs`}>{common('seeAll')}</Link></div>{needed.length?<div className="item-list">{needed.slice(0,3).map(item=><div className="item-row" key={item.id}><ItemVisual visualKey={item.visualKey}/><div className="item-row-main"><h3>{item.name}</h3><div className="item-meta"><span>{t('updatedBy',{name:item.updatedBy.name})}</span><PriorityBadge priority={item.priority}/></div></div><StatusBadge status={item.status}/></div>)}</div>:items.data&&<EmptyState title={low.length?t('nothingNeeded'):t('everythingGood')} body={low.length?t('lowReminder'):t('everythingGoodBody')}/>}</section>
    {issues.isError&&<div className="home-issues-error"><ActionError message={common('loadFailed')} retry={()=>void issues.refetch()} pending={issues.isFetching}/></div>}
    {(issues.data?.filter(issue=>issue.status!=='RESOLVED').length??0)>0&&<section className="feature-callout"><h2><Wrench/> {t('issues')}</h2><Link className="button" href={`/${locale}/issues`}>{t('viewIssues')}</Link></section>}
    </div><Sheet open={Boolean(selected)} onClose={()=>setSelected(null)} pending={update.isPending} title={selected?.name??''}>{selected&&<><div className="selected-item"><ItemVisual visualKey={selected.visualKey} size="lg"/><StatusBadge status={selected.status}/></div><StatusSelector value={selected.status} disabled={update.isPending} onChange={status=>update.mutate(status)}/>{update.isPending&&<p className="form-hint" role="status">{common('saving')}</p>}{update.isError&&<ActionError retry={()=>update.mutate(update.variables!)}/>}</>}</Sheet>
  </>;
}
