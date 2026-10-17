'use client';
import {Bell, CheckCheck, ChevronRight, Flag, ShoppingBasket} from 'lucide-react';
import {useMutation, useInfiniteQuery, useQueryClient, type InfiniteData} from '@tanstack/react-query';
import {useLocale, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useRef, useState} from 'react';
import {notificationKinds, type HouseholdNotification, type NotificationInbox, type NotificationKind} from '@housefamily/shared';
import {api} from '@/lib/api';
import {ActionError, EmptyState, ErrorState, LoadingState, Sheet} from './ui';
import {PendingLabel, RefreshIndicator} from './loading';

type ReadAction = {type: 'all'} | {type: 'one'; notification: HouseholdNotification};
export function NotificationsCenter({userId, householdId}: {userId: string; householdId: string}) {
  const t = useTranslations('inbox'); const common = useTranslations('common'); const locale = useLocale(); const router = useRouter();
  const [open,setOpen] = useState(false); const saving = useRef(false); const client = useQueryClient();
  const queryKey = ['notifications',householdId,userId];
  const inbox = useInfiniteQuery({queryKey, initialPageParam: null as string | null,
    queryFn: ({pageParam}) => api<NotificationInbox>(`/notifications/inbox${pageParam?`?cursor=${encodeURIComponent(pageParam)}`:''}`),
    getNextPageParam: page => page.nextCursor ?? undefined,
    refetchInterval: 30_000, refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always', refetchOnReconnect: 'always',
  });
  const rows = [...new Map((inbox.data?.pages.flatMap(page=>page.items)??[]).map(row=>[row.id,row])).values()];
  const unreadCount = inbox.data?.pages[0]?.unreadCount ?? 0;
  const go = (notification: HouseholdNotification) => {
    const target = notification.kind === 'SHOPPING_STARTED' ? 'shopping' : notificationKinds.includes(notification.kind as NotificationKind) ? 'needs' : 'activity';
    setOpen(false); router.push(`/${locale}/${target}`);
  };
  const read = useMutation({mutationFn: (action: ReadAction) => action.type === 'all'
    ? api('/notifications/read-all',{method:'PATCH'}) : api(`/notifications/${action.notification.id}/read`,{method:'PATCH'}),
    onSuccess: (_result,action) => {
      client.setQueryData<InfiniteData<NotificationInbox,string|null>>(queryKey,old=>old?{...old,pages:old.pages.map(page=>({...page,
        unreadCount:action.type==='all'?0:Math.max(0,page.unreadCount-(action.notification.status==='UNREAD'?1:0)),
        items:page.items.map(row=>action.type==='all'||row.id===action.notification.id?{...row,status:'READ'}:row),
      }))}:old);
      void client.invalidateQueries({queryKey});
      if(action.type==='one') go(action.notification);
    },onSettled:()=>{saving.current=false;},
  });
  const submit = (action: ReadAction) => {if(saving.current)return;saving.current=true;read.mutate(action);};
  const show = () => {read.reset();setOpen(true);void inbox.refetch();};
  const openNotification = (notification: HouseholdNotification) => {if(saving.current)return;if(notification.status==='READ')go(notification);else submit({type:'one',notification});};
  const dateFormat = new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  return <><button type="button" className="notification-bell" onClick={show} aria-haspopup="dialog" aria-expanded={open} aria-label={inbox.data?t('open',{count:unreadCount}):t('title')}><Bell aria-hidden="true"/><span className="notification-bell-label">{t('title')}</span>{unreadCount>0&&<span className="notification-count" aria-hidden="true">{unreadCount>99?'99+':unreadCount}</span>}</button>
    <Sheet open={open} title={t('title')} onClose={()=>setOpen(false)} pending={read.isPending}>
      <div className="inbox-heading"><p>{t('householdOnly')}</p><button type="button" className="text-button inbox-read-all" disabled={!unreadCount||read.isPending||!inbox.data} onClick={()=>submit({type:'all'})}><CheckCheck aria-hidden="true"/><PendingLabel pending={read.isPending&&read.variables?.type==='all'}>{read.isPending&&read.variables?.type==='all'?common('saving'):t('readAll')}</PendingLabel></button></div>
      <RefreshIndicator active={inbox.isRefetching}/>
      {read.isError&&<ActionError retry={()=>submit(read.variables!)} pending={read.isPending}/>}
      {inbox.isPending?<LoadingState rows={3}/>:inbox.isError&&!inbox.data?<ErrorState message={common('loadFailed')} retry={()=>void inbox.refetch()}/>:<>
        {inbox.isError&&inbox.data&&<ActionError message={common('loadFailed')} retry={()=>void inbox.refetch()} pending={inbox.isFetching}/>}
        {rows.length?<ul className="inbox-list">{rows.map(notification=>{
          const known = notificationKinds.includes(notification.kind as NotificationKind) && typeof notification.data?.actorName === 'string';
          const kind = notification.kind as NotificationKind;
          const Icon = kind === 'ITEM_URGENT' ? Flag : kind.startsWith('SHOPPING_') ? ShoppingBasket : Bell;
          const title = known?t(`events.${kind}.title`):notification.title;
          const body = known?t(`events.${kind}.body`,{actor:notification.data!.actorName,item:notification.data?.subjectName??''}):notification.body;
          return <li key={notification.id}><button type="button" className={`inbox-row ${notification.status==='UNREAD'?'is-unread':''} ${kind==='ITEM_URGENT'?'is-urgent':''}`} disabled={read.isPending} onClick={()=>openNotification(notification)}><span className="inbox-icon" aria-hidden="true"><Icon/></span><span className="inbox-copy"><span className="inbox-title">{title}</span><span className="inbox-body" dir="auto">{body}</span><time dateTime={notification.createdAt}>{dateFormat.format(new Date(notification.createdAt))}</time></span><span className="inbox-row-end">{notification.status==='UNREAD'&&<span className="inbox-unread"><span className="sr-only">{t('unread')}</span></span>}<ChevronRight aria-hidden="true"/></span></button></li>;
        })}</ul>:<EmptyState icon={<Bell aria-hidden="true"/>} title={t('empty')} body={t('emptyBody')}/>}
        {inbox.hasNextPage&&<button type="button" className="button secondary full inbox-load-more" disabled={inbox.isFetching||read.isPending} onClick={()=>void inbox.fetchNextPage()}><PendingLabel pending={inbox.isFetchingNextPage}>{inbox.isFetchingNextPage?common('loading'):t('older')}</PendingLabel></button>}
      </>}
    </Sheet>
  </>;
}
