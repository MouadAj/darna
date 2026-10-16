'use client';
import {Crown, Languages, LogOut, Link2, MoreHorizontal, UserRoundPlus} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useSearchParams, useRouter, useParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Suspense, useState} from 'react';
import {api} from '@/lib/api';
import {PageSkeleton, PendingLabel, RefreshIndicator} from '@/components/loading';
import type {Family, SessionUser} from '@/lib/types';
import {useToast} from '@/components/toast';
import {InstallLink} from '@/components/install-page';
import {ActionError, ConfirmDialog, ErrorState, PageHeader, Sheet} from '@/components/ui';
import type {Locale} from '@housefamily/shared';

function FamilyContent(){
  const t=useTranslations('family');const common=useTranslations('common');const search=useSearchParams();const router=useRouter();const {locale}=useParams<{locale:string}>();const client=useQueryClient();const toast=useToast();
  const [inviteOpen,setInviteOpen]=useState(search.get('invite')==='1');const [name,setName]=useState('');const [email,setEmail]=useState('');const [invitationUrl,setInvitationUrl]=useState<string|null>(null);const [remove,setRemove]=useState<{id:string;name:string}|null>(null);
  const me=useQuery({queryKey:['me'],queryFn:()=>api<SessionUser>('/auth/me')});const family=useQuery({queryKey:['family'],queryFn:()=>api<Family>('/households/family')});
  const invite=useMutation({mutationFn:()=>api<{invitationUrl:string}>('/invitations',{method:'POST',body:JSON.stringify({name,email,locale})}),onSuccess:data=>{setInvitationUrl(data.invitationUrl);setName('');setEmail('');toast.show(t('linkCreated'));void client.invalidateQueries({queryKey:['family']});}});
  const refreshLink=useMutation({mutationFn:(id:string)=>api<{invitationUrl:string}>(`/invitations/${id}/link`,{method:'POST'}),onSuccess:data=>{setInvitationUrl(data.invitationUrl);toast.show(t('linkCreated'));}});
  const cancel=useMutation({mutationFn:(id:string)=>api(`/invitations/${id}`,{method:'DELETE'}),onSuccess:()=>void client.invalidateQueries({queryKey:['family']})});
  const removeMember=useMutation({mutationFn:(id:string)=>api(`/households/members/${id}`,{method:'DELETE'}),onSuccess:()=>{setRemove(null);void client.invalidateQueries({queryKey:['family']});}});
  const language=useMutation({mutationFn:(nextLocale:Locale)=>api<{preferredLocale:Locale}>('/users/me/preferences',{method:'PATCH',body:JSON.stringify({locale:nextLocale})}),onSuccess:data=>{client.setQueryData<SessionUser>(['me'],current=>current?{...current,preferredLocale:data.preferredLocale}:current);router.replace(`/${data.preferredLocale}/family`);}});
  const close=()=>{setInviteOpen(false);setInvitationUrl(null);invite.reset();setName('');setEmail('');if(search.get('invite'))router.replace(`/${locale}/family`);};
  const logout=useMutation({mutationFn:()=>api('/auth/logout',{method:'POST'}),onSuccess:()=>{client.clear();router.replace(`/${locale}/welcome`);}});
  if(family.isPending)return <PageSkeleton variant="family"/>;if(family.isError&&!family.data)return <ErrorState message={common('loadFailed')} retry={()=>family.refetch()}/>;
  const isOwner=me.data?.role==='OWNER';
  return <><RefreshIndicator active={family.isFetching}/>{family.isError&&<ActionError message={common('loadFailed')} retry={()=>void family.refetch()} pending={family.isFetching}/>}<PageHeader title={t('title',{name:family.data!.name})} subtitle={t('subtitle')} action={isOwner?<button className="button compact" onClick={()=>{invite.reset();setInvitationUrl(null);setInviteOpen(true);}}><UserRoundPlus aria-hidden="true"/>{t('invite')}</button>:undefined}/><div className="family-layout" aria-busy={family.isFetching}><div className="family-members"><div className="member-list">{family.data!.members.map(member=><div className="member-row" key={member.id}><span className={`avatar ${member.role==='OWNER'?'owner':''}`}>{member.role==='OWNER'?<Crown aria-hidden="true"/>:member.user.name.slice(0,1).toUpperCase()}</span><div className="member-info"><h3>{member.user.name}</h3><p>{member.role==='OWNER'?t('owner'):t('member')} · {member.user.email}</p></div>{isOwner&&member.role!=='OWNER'&&<button className="row-menu" onClick={()=>{removeMember.reset();setRemove({id:member.id,name:member.user.name});}} aria-label={t('removeAccess')}><MoreHorizontal aria-hidden="true"/></button>}</div>)}</div>
    {family.data!.invitations.length>0&&<section className="pending-block"><h2>{t('pending')}</h2><div className="member-list">{family.data!.invitations.map(invitation=><div className="member-row" key={invitation.id}><span className="avatar"><Link2 aria-hidden="true"/></span><div className="member-info"><h3>{invitation.invitedName}</h3><p>{invitation.invitedEmail} · {t('pending')}</p></div>{isOwner&&<div className="pending-actions"><button className="text-button" disabled={refreshLink.isPending||cancel.isPending} onClick={()=>refreshLink.mutate(invitation.id)}>{refreshLink.isPending&&refreshLink.variables===invitation.id?common('working'):t('newLink')}</button><button className="text-button danger-text" disabled={refreshLink.isPending||cancel.isPending} onClick={()=>cancel.mutate(invitation.id)}>{cancel.isPending&&cancel.variables===invitation.id?common('working'):common('cancel')}</button></div>}</div>)}</div></section>}
    {refreshLink.isError&&<ActionError retry={()=>refreshLink.mutate(refreshLink.variables!)}/ >}{cancel.isError&&<ActionError retry={()=>cancel.mutate(cancel.variables!)}/ >}
    {invitationUrl&&!inviteOpen&&<InvitationLink key={invitationUrl} url={invitationUrl}/>}
    {!isOwner&&<p className="form-hint">{t('onlyOwner')}</p>}
    </div><section className="account-section" aria-labelledby="account-title"><div className="account-heading"><span><Languages aria-hidden="true"/></span><div><h2 id="account-title">{t('account')}</h2><p>{t('accountHint')}</p></div></div><div className="account-setting"><p className="field-label">{t('language')}</p><div className="language-switcher" aria-label={t('language')}>{(['en','fr','ar'] as Locale[]).map(value=><button type="button" key={value} className={locale===value?'active':''} aria-pressed={locale===value} disabled={language.isPending} onClick={()=>language.mutate(value)}>{t(value)}</button>)}</div>{language.isError&&<p className="field-error" role="alert">{t('languageError')}</p>}</div><InstallLink className="account-install"/><button className="button secondary full account-logout" disabled={logout.isPending} onClick={()=>logout.mutate()}><LogOut aria-hidden="true"/><PendingLabel pending={logout.isPending}>{logout.isPending?common('working'):t('logout')}</PendingLabel></button>{logout.isError&&<ActionError retry={()=>logout.mutate()}/ >}</section>
    </div><Sheet open={inviteOpen} onClose={close} pending={invite.isPending} title={t('inviteTitle')}>
      {invitationUrl?<><InvitationLink key={invitationUrl} url={invitationUrl}/><button className="button full" onClick={close}>{common('close')}</button></>:<>
        <p className="form-hint">{t('inviteHint')}</p>
        <div className="field"><label htmlFor="invite-name">{t('name')}</label><input className="input" id="invite-name" value={name} disabled={invite.isPending} onChange={e=>setName(e.target.value)}/></div>
        <div className="field"><label htmlFor="invite-email">{t('email')}</label><input className="input" type="email" id="invite-email" value={email} disabled={invite.isPending} onChange={e=>setEmail(e.target.value)}/></div>
        {invite.isError&&<ActionError retry={()=>invite.mutate()}/>}
        <button className="button full" disabled={invite.isPending||name.trim().length<2||!email.includes('@')} onClick={()=>invite.mutate()}><PendingLabel pending={invite.isPending}>{invite.isPending?common('working'):t('createLink')}</PendingLabel></button>
      </>}
    </Sheet>
    <ConfirmDialog open={Boolean(remove)} title={t('removeTitle',{name:remove?.name??''})} body={t('removeBody')} confirmLabel={t('removeAccess')} pending={removeMember.isPending} onClose={()=>setRemove(null)} onConfirm={()=>remove&&removeMember.mutate(remove.id)}>{removeMember.isError&&<ActionError/>}</ConfirmDialog>
  </>;
}
function InvitationLink({url}: {url: string}) {
  const t=useTranslations('family');
  const [copyState,setCopyState]=useState<'idle'|'copied'|'error'>('idle');
  const copy=async()=>{
    try {await navigator.clipboard.writeText(url);setCopyState('copied');}
    catch {setCopyState('error');}
  };
  return <section className="invitation-link" aria-label={t('shareLink')}>
    <p>{t('shareHint')}</p>
    <div className="field"><label htmlFor="invitation-link">{t('shareLink')}</label><input className="input" id="invitation-link" dir="ltr" readOnly value={url} onFocus={event=>event.currentTarget.select()}/></div>
    <button className="button secondary full" onClick={()=>void copy()}>{copyState==='copied'?t('copied'):t('copyLink')}</button>
    {copyState==='error'&&<p className="field-error" role="alert">{t('copyError')}</p>}
  </section>;
}

export default function FamilyPage(){return <Suspense fallback={<PageSkeleton variant="family"/>}><FamilyContent/></Suspense>}
