'use client';
import {Check, Plus, RotateCcw, Wrench} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useState} from 'react';
import type {IssueStatus} from '@housefamily/shared';
import {api} from '@/lib/api';
import type {HomeIssue} from '@/lib/types';
import {ItemVisual} from '@/components/item-visual';
import {useToast} from '@/components/toast';
import {ActionError, EmptyState, ErrorState, LoadingState, PageHeader, Sheet} from '@/components/ui';

export default function IssuesPage(){
  const t=useTranslations('issues');const common=useTranslations('common');const {locale}=useParams<{locale:string}>();const client=useQueryClient();const toast=useToast();const [open,setOpen]=useState(false);const [title,setTitle]=useState('');
  const issues=useQuery({queryKey:['issues'],queryFn:()=>api<HomeIssue[]>('/home-issues')});
  const create=useMutation({mutationFn:()=>api('/home-issues',{method:'POST',body:JSON.stringify({title,visualKey:'repair'})}),onSuccess:()=>{setOpen(false);setTitle('');toast.show(t('added'));void client.invalidateQueries({queryKey:['issues']});void client.invalidateQueries({queryKey:['activity']});}});
  const update=useMutation({mutationFn:({id,status}:{id:string;status:IssueStatus})=>api(`/home-issues/${id}`,{method:'PATCH',body:JSON.stringify({status})}),onSuccess:()=>{void client.invalidateQueries({queryKey:['issues']});void client.invalidateQueries({queryKey:['activity']});}});
  return <><PageHeader title={t('title')} subtitle={t('subtitle')} backHref={`/${locale}/activity`} action={<button className="button compact" onClick={()=>{create.reset();setOpen(true);}}><Plus/>{t('add')}</button>}/>{issues.isLoading?<LoadingState rows={4}/>:issues.isError?<ErrorState message={common('loadFailed')} retry={()=>issues.refetch()}/>:issues.data?.length?<div className="issues-workspace">{update.isError&&<ActionError retry={()=>update.mutate(update.variables!)}/>}<div className="issues-grid">{issues.data.map(issue=><article className="issue-row" key={issue.id}><div className="issue-top"><ItemVisual visualKey={issue.visualKey}/><div className="issue-copy"><h3>{issue.title}</h3><span className={`status-badge issue-${issue.status.toLowerCase()}`}>{t(issue.status)}</span><p>{issue.handledBy?t('handledBy',{name:issue.handledBy.name}):t('reportedBy',{name:issue.createdBy.name})}</p></div></div><div className="issue-actions">{issue.status==='OPEN'&&<button className="button soft" disabled={update.isPending} onClick={()=>update.mutate({id:issue.id,status:'IN_PROGRESS'})}><Wrench/>{t('handle')}</button>}{issue.status!=='RESOLVED'&&<button className="button" disabled={update.isPending} onClick={()=>update.mutate({id:issue.id,status:'RESOLVED'})}><Check/>{t('fixed')}</button>}{issue.status==='RESOLVED'&&<button className="button secondary" disabled={update.isPending} onClick={()=>update.mutate({id:issue.id,status:'OPEN'})}><RotateCcw/>{t('reopen')}</button>}</div></article>)}</div></div>:<EmptyState icon={<Wrench/>} title={t('empty')} body={t('emptyBody')}/>}<Sheet open={open} onClose={()=>setOpen(false)} pending={create.isPending} title={t('addTitle')}><div className="field"><label htmlFor="issue-title">{t('addTitle')}</label><textarea className="textarea" id="issue-title" autoFocus value={title} onChange={event=>setTitle(event.target.value)} placeholder={t('placeholder')}/></div>{create.isError&&<ActionError retry={()=>create.mutate()}/>}<button className="button full" disabled={create.isPending||title.trim().length<3} onClick={()=>create.mutate()}>{create.isPending?common('saving'):common('add')}</button></Sheet></>;
}
