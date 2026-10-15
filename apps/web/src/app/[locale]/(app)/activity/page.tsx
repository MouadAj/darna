'use client';
import {AlertCircle, CheckCircle2, Home, PackageCheck, ShoppingBasket, UserRoundPlus, Wrench} from 'lucide-react';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {api} from '@/lib/api';
import {PageSkeleton, RefreshIndicator} from '@/components/loading';
import type {Activity as ActivityType} from '@/lib/types';
import {ActionError, EmptyState, ErrorState, PageHeader} from '@/components/ui';
import {NotificationsPrompt} from '@/components/notifications-prompt';

const icons:Record<string,typeof Home>={HOUSEHOLD_CREATED:Home,MEMBER_JOINED:UserRoundPlus,ITEM_NEEDED:AlertCircle,ITEM_LOW:AlertCircle,ITEM_AVAILABLE:CheckCircle2,ITEM_PURCHASED:PackageCheck,SHOPPING_STARTED:ShoppingBasket,SHOPPING_COMPLETED:ShoppingBasket,ISSUE_ADDED:Wrench,ISSUE_CLAIMED:Wrench,ISSUE_RESOLVED:CheckCircle2,ISSUE_REOPENED:Wrench};
export default function ActivityPage(){
  const t=useTranslations('activity');const common=useTranslations('common');const locale=useLocale();const {locale:routeLocale}=useParams<{locale:string}>();const activity=useQuery({queryKey:['activity'],queryFn:()=>api<ActivityType[]>('/activity')});
  if(activity.isPending)return <PageSkeleton variant="activity"/>;
  return <><RefreshIndicator active={activity.isFetching}/>{activity.isError&&activity.data&&<ActionError message={common('loadFailed')} retry={()=>void activity.refetch()} pending={activity.isFetching}/>}<PageHeader title={t('title')} subtitle={t('subtitle')}/><div className="activity-layout"><div className="activity-notifications"><NotificationsPrompt/></div><div className="activity-feed" aria-busy={activity.isFetching}>{activity.isError&&!activity.data?<ErrorState message={activity.error.message} retry={()=>activity.refetch()}/>:activity.data?.length?<div className="activity-list">{activity.data.map((entry,index)=>{const date=new Date(entry.createdAt);const previous=index>0?new Date(activity.data[index-1].createdAt).toDateString():null;const showDay=date.toDateString()!==previous;const today=date.toDateString()===new Date().toDateString();const Icon=icons[entry.type]??Home;const values={name:entry.actor?.name??'',subject:entry.subjectName??''};return <div key={entry.id}>{showDay&&<h2 className="activity-day">{today?common('today'):date.toLocaleDateString(locale,{weekday:'long',month:'long',day:'numeric'})}</h2>}<article className="activity-row"><span className="activity-icon"><Icon/></span><div className="activity-copy"><h3>{t.has(entry.type)?t(entry.type as Parameters<typeof t>[0],values):entry.subjectName}</h3><p>{entry.actor?.name} · {date.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}</p></div></article></div>})}</div>:<EmptyState title={t('empty')} body={t('emptyBody')}/>}</div><section className="feature-callout"><h2><Wrench/> {t('issues')}</h2><p>{t('issuesBody')}</p><Link className="button" href={`/${routeLocale}/issues`}>{t('openIssues')}</Link></section></div></>;
}
