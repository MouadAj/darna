'use client';
import {Crown, Languages, LogOut, MailPlus, MoreHorizontal, UserRoundPlus} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useSearchParams, useRouter, useParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Suspense, useState} from 'react';
import {api} from '@/lib/api';
import type {Family, SessionUser} from '@/lib/types';
import {useToast} from '@/components/toast';
import {ConfirmDialog, ErrorState, LoadingState, PageHeader, Sheet} from '@/components/ui';
import type {Locale} from '@housefamily/shared';

function FamilyContent(){
  const t=useTranslations('family');const common=useTranslations('common');const search=useSearchParams();const router=useRouter();const {locale}=useParams<{locale:string}>();const client=useQueryClient();const toast=useToast();
  const [inviteOpen,setInviteOpen]=useState(search.get('invite')==='1');const [name,setName]=useState('');const [email,setEmail]=useState('');const [devUrl,setDevUrl]=useState<string|null>(null);const [remove,setRemove]=useState<{id:string;name:string}|null>(null);
  const me=useQuery({queryKey:['me'],queryFn:()=>api<SessionUser>('/auth/me')});const family=useQuery({queryKey:['family'],queryFn:()=>api<Family>('/households/family')});
  const invite=useMutation({mutationFn:()=>api<{developmentUrl?:string}>('/invitations',{method:'POST',body:JSON.stringify({name,email,locale})}),onSuccess:data=>{setDevUrl(data.developmentUrl??null);setName('');setEmail('');toast.show(t('sent'));void client.invalidateQueries({queryKey:['family']});}});
  const resend=useMutation({mutationFn:(id:string)=>api<{developmentUrl?:string}>(`/invitations/${id}/resend`,{method:'POST'}),onSuccess:data=>{setDevUrl(data.developmentUrl??null);toast.show(t('sent'));}});
  const cancel=useMutation({mutationFn:(id:string)=>api(`/invitations/${id}`,{method:'DELETE'}),onSuccess:()=>void client.invalidateQueries({queryKey:['family']})});
  const removeMember=useMutation({mutationFn:(id:string)=>api(`/households/members/${id}`,{method:'DELETE'}),onSuccess:()=>{setRemove(null);void client.invalidateQueries({queryKey:['family']});}});
  const language=useMutation({mutationFn:(nextLocale:Locale)=>api<{preferredLocale:Locale}>('/users/me/preferences',{method:'PATCH',body:JSON.stringify({locale:nextLocale})}),onSuccess:data=>{client.setQueryData<SessionUser>(['me'],current=>current?{...current,preferredLocale:data.preferredLocale}:current);router.replace(`/${data.preferredLocale}/family`);}});
  const close=()=>{setInviteOpen(false);setDevUrl(null);if(search.get('invite'))router.replace(`/${locale}/family`);};
  const logout=async()=>{await api('/auth/logout',{method:'POST'});client.clear();router.replace(`/${locale}/welcome`);};
  if(family.isLoading)return <><PageHeader title="Family"/><LoadingState rows={5}/></>;if(family.isError)return <ErrorState message={family.error.message} retry={()=>family.refetch()}/>;
  const isOwner=me.data?.role==='OWNER';
  return <><PageHeader title={t('title',{name:family.data!.name})} subtitle={t('subtitle')} action={isOwner?<button className="button compact" onClick={()=>setInviteOpen(true)}><UserRoundPlus/>{t('invite')}</button>:undefined}/><div className="family-layout"><div className="family-members"><div className="member-list">{family.data!.members.map(member=><div className="member-row" key={member.id}><span className={`avatar ${member.role==='OWNER'?'owner':''}`}>{member.role==='OWNER'?<Crown/>:member.user.name.slice(0,1).toUpperCase()}</span><div className="member-info"><h3>{member.user.name}</h3><p>{member.role==='OWNER'?t('owner'):t('member')} · {member.user.email}</p></div>{isOwner&&member.role!=='OWNER'&&<button className="row-menu" onClick={()=>setRemove({id:member.id,name:member.user.name})} aria-label={t('removeAccess')}><MoreHorizontal/></button>}</div>)}</div>
    {family.data!.invitations.length>0&&<section className="pending-block"><h2>{t('pending')}</h2><div className="member-list">{family.data!.invitations.map(invitation=><div className="member-row" key={invitation.id}><span className="avatar"><MailPlus/></span><div className="member-info"><h3>{invitation.invitedName}</h3><p>{invitation.invitedEmail} · {t('pending')}</p></div>{isOwner&&<div className="pending-actions"><button className="text-button" onClick={()=>resend.mutate(invitation.id)}>{t('resend')}</button><button className="text-button danger-text" onClick={()=>cancel.mutate(invitation.id)}>{common('cancel')}</button></div>}</div>)}</div></section>}
    {!isOwner&&<p className="form-hint">{t('onlyOwner')}</p>}
    </div><section className="account-section" aria-labelledby="account-title"><div className="account-heading"><span><Languages/></span><div><h2 id="account-title">{t('account')}</h2><p>{t('accountHint')}</p></div></div><div className="account-setting"><p className="field-label">{t('language')}</p><div className="language-switcher" aria-label={t('language')}>{(['en','fr','ar'] as Locale[]).map(value=><button type="button" key={value} className={locale===value?'active':''} aria-pressed={locale===value} disabled={language.isPending} onClick={()=>language.mutate(value)}>{t(value)}</button>)}</div>{language.isError&&<p className="field-error" role="alert">{t('languageError')}</p>}</div><button className="button secondary full account-logout" onClick={logout}><LogOut/>{t('logout')}</button></section>
    </div><Sheet open={inviteOpen} onClose={close} title={t('inviteTitle')}><div className="field"><label htmlFor="invite-name">{t('name')}</label><input className="input" id="invite-name" value={name} onChange={e=>setName(e.target.value)}/></div><div className="field"><label htmlFor="invite-email">{t('email')}</label><input className="input" type="email" id="invite-email" value={email} onChange={e=>setEmail(e.target.value)}/></div>{invite.isError&&<p className="field-error">{invite.error.message}</p>}<button className="button full" disabled={invite.isPending||name.trim().length<2||!email.includes('@')} onClick={()=>invite.mutate()}>{invite.isPending?'…':t('send')}</button>{devUrl&&<div className="dev-link"><p>{t('developmentLink')}</p><a className="button soft" href={devUrl}>Open invitation</a></div>}</Sheet>
    <ConfirmDialog open={Boolean(remove)} title={t('removeTitle',{name:remove?.name??''})} body={t('removeBody')} confirmLabel={t('removeAccess')} pending={removeMember.isPending} onClose={()=>setRemove(null)} onConfirm={()=>remove&&removeMember.mutate(remove.id)}/>
  </>;
}
export default function FamilyPage(){return <Suspense><FamilyContent/></Suspense>}
