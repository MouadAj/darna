'use client';
import {CheckCircle2, Clock3, Moon, Plus, Star, Sun, Sunrise, Wrench} from 'lucide-react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {api} from '@/lib/api';
import {PageSkeleton, RefreshIndicator} from '@/components/loading';
import type {HomeIssue, Item, SessionUser} from '@/lib/types';
import {ItemVisual} from '@/components/item-visual';
import {ItemDetails, ItemDetailSheet} from '@/components/item-details';
import {StatusIcon} from '@/components/status-icon';
import {ActionError, EmptyState, ErrorState, PriorityBadge, StatusBadge} from '@/components/ui';

export default function HomePage() {
  const t=useTranslations('home'); const common=useTranslations('common'); const s=useTranslations('status'); const {locale}=useParams<{locale:string}>(); const [selected,setSelected]=useState<Item|null>(null);
  const me=useQuery({queryKey:['me'],queryFn:()=>api<SessionUser>('/auth/me')});
  const items=useQuery({queryKey:['items'],queryFn:()=>api<Item[]>('/items')});
  const issues=useQuery({queryKey:['issues'],queryFn:()=>api<HomeIssue[]>('/home-issues')});

  const hour=new Date().getHours(); const greeting=hour<12?'morning':hour<18?'afternoon':'evening'; const data=items.data??[]; const needed=data.filter(item=>item.status==='NEEDED'); const low=data.filter(item=>item.status==='LOW'); const usual=data.filter(item=>item.usual).slice(0,6);
  const GreetingIcon = greeting === 'morning' ? Sunrise : greeting === 'afternoon' ? Sun : Moon;
  if(items.isPending)return <PageSkeleton variant="dashboard"/>;
  return <><RefreshIndicator active={items.isFetching||issues.isFetching}/>{items.isError&&items.data&&<ActionError message={common('loadFailed')} retry={()=>void items.refetch()} pending={items.isFetching}/>}<header className="page-header home-header"><p className="eyebrow">{me.data?.householdName}</p><h1><span>{t(greeting,{name:me.data?.name??''})}</span><span className="greeting-icon" aria-hidden="true"><GreetingIcon/></span></h1></header>
    <div className="home-dashboard" aria-busy={items.isFetching||issues.isFetching}>{items.isError&&!items.data?<div className="home-data-error"><ErrorState message={common('loadFailed')} retry={()=>void items.refetch()}/></div>:<div className="summary-grid"><Link href={`/${locale}/needs?status=NEEDED`} className="summary-pill needed"><span className="summary-icon"><StatusIcon status="NEEDED"/></span><span>{t('neededCount',{count:needed.length})}</span></Link><Link href={`/${locale}/needs?status=LOW`} className="summary-pill low"><span className="summary-icon"><StatusIcon status="LOW"/></span><span>{t('lowCount',{count:low.length})}</span></Link></div>}
    <section className="hero-action"><h2>{t('question')}</h2><Link className="button" href={`/${locale}/needs?add=1`}><Plus aria-hidden="true"/>{t('addSomething')}</Link></section>
    <section className="home-usual"><div className="section-heading"><h2><span className="section-icon section-icon--gold" aria-hidden="true"><Star aria-hidden="true"/></span>{t('usual')}</h2></div>{items.isError&&!items.data?null:<div className="usual-grid">{usual.map(item=><button key={item.id} className="usual-card" data-status={item.status} aria-label={`${item.name}, ${s(item.status)}`} onClick={()=>{setSelected(item);}}><span className={`usual-status status-${item.status.toLowerCase()}`} aria-hidden="true"><StatusIcon status={item.status}/></span><ItemVisual visualKey={item.visualKey}/><span>{item.name}</span></button>)}</div>}<p className="form-hint">{t('tapHint')}</p></section>
    <section className="home-needed"><div className="section-heading"><h2><span className="section-icon section-icon--needed" aria-hidden="true"><StatusIcon status="NEEDED"/></span>{t('weNeed')}</h2><Link href={`/${locale}/needs`}>{common('seeAll')}</Link></div>{needed.length?<div className="item-list">{needed.slice(0,3).map(item=><div className="item-row" key={item.id}><ItemVisual visualKey={item.visualKey}/><div className="item-row-main"><div className="item-name-details"><h3>{item.name}</h3><ItemDetails quantity={item.quantity} notes={item.notes}/></div><div className="item-meta"><span>{t('updatedBy',{name:item.updatedBy.name})}</span><PriorityBadge priority={item.priority}/></div></div><StatusBadge status={item.status}/></div>)}</div>:items.data&&<EmptyState icon={low.length?<Clock3 aria-hidden="true"/>:<CheckCircle2 aria-hidden="true"/>} title={low.length?t('nothingNeeded'):t('everythingGood')} body={low.length?t('lowReminder'):t('everythingGoodBody')}/>}</section>
    {issues.isError&&<div className="home-issues-error"><ActionError message={common('loadFailed')} retry={()=>void issues.refetch()} pending={issues.isFetching}/></div>}
    {(issues.data?.filter(issue=>issue.status!=='RESOLVED').length??0)>0&&<section className="feature-callout"><h2><span className="section-icon section-icon--info" aria-hidden="true"><Wrench aria-hidden="true"/></span>{t('issues')}</h2><Link className="button" href={`/${locale}/issues`}>{t('viewIssues')}</Link></section>}
    </div><ItemDetailSheet item={selected} onClose={()=>setSelected(null)}/>
  </>;
}
