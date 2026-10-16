'use client';
import {ArrowLeft, Plus, Search, Star} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import type {Priority} from '@housefamily/shared';
import {api} from '@/lib/api';
import {PendingLabel} from './loading';
import type {Category, Item} from '@/lib/types';
import {ItemVisual, type SelectableItemIcon} from './item-visual';
import {ItemIconPicker} from './item-icon-picker';
import {ActionError, EmptyState, ErrorState, LoadingState, Sheet} from './ui';
import {useToast} from './toast';

export function AddNeedSheet({open, onClose}: {open: boolean; onClose: () => void}) {
  return open ? <AddNeedContent onClose={onClose}/> : null;
}

function AddNeedContent({onClose}: {onClose: () => void}) {
  const t=useTranslations('needs'); const p=useTranslations('priority'); const common=useTranslations('common');
  const queryClient=useQueryClient(); const toast=useToast();
  const [search,setSearch]=useState(''); const [category,setCategory]=useState('all');
  const [selected,setSelected]=useState<Item|null>(null); const [priority,setPriority]=useState<Priority>('NORMAL');
  const searchRef=useRef<HTMLInputElement>(null); const backRef=useRef<HTMLButtonElement>(null); const previousDetails=useRef(false);
  const [custom,setCustom]=useState(false); const [customName,setCustomName]=useState(''); const [customCategory,setCustomCategory]=useState('');
  const [customIcon,setCustomIcon]=useState<SelectableItemIcon>('custom');
  const inDetails=Boolean(selected)||custom;
  useEffect(()=>{if(inDetails)backRef.current?.focus();else if(previousDetails.current)searchRef.current?.focus();previousDetails.current=inDetails;},[inDetails]);
  const items=useQuery({queryKey:['items'],queryFn:()=>api<Item[]>('/items')});
  const categories=useQuery({queryKey:['categories'],queryFn:()=>api<Category[]>('/categories')});
  const mutation=useMutation({mutationFn:async()=>{
    if(custom) return api('/items',{method:'POST',body:JSON.stringify({name:customName.trim(),visualKey:customIcon,categoryId:customCategory||undefined,priority})});
    if(!selected) throw new Error('Choose an item');
    return api(`/items/${selected.id}`,{method:'PATCH',body:JSON.stringify({status:'NEEDED',priority})});
  },onSuccess:()=>{
    void queryClient.invalidateQueries({queryKey:['items']});
    void queryClient.invalidateQueries({queryKey:['activity']});
    toast.show(t(custom?'added':'updated')); onClose();
  }});
  const filtered=(items.data??[]).filter(item=>(category==='all'||item.category?.key===category)&&item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const usual=filtered.filter(item=>item.usual); const others=filtered.filter(item=>!item.usual);
  const back=()=>{setSelected(null);setCustom(false);mutation.reset();};
  const catalog=(entries: Item[]) => <div className="catalog-grid">{entries.map(item=><button type="button" key={item.id} className="catalog-item" onClick={()=>{setSelected(item);setPriority(item.priority);mutation.reset();}}><ItemVisual visualKey={item.visualKey}/><span>{item.name}</span></button>)}</div>;
  return <Sheet open onClose={onClose} pending={mutation.isPending} title={custom?t('customTitle'):t('addTitle')}>
    {selected||custom?<form onSubmit={event=>{event.preventDefault();if(!mutation.isPending&&(!custom||customName.trim()))mutation.mutate();}}>
      <button type="button" className="back-link" ref={backRef} disabled={mutation.isPending} onClick={back}><ArrowLeft aria-hidden="true"/>{common('back')}</button>
      {selected&&<div className="selected-item"><ItemVisual visualKey={selected.visualKey} size="lg"/><h3>{selected.name}</h3></div>}
      {custom&&<><div className="field"><label htmlFor="custom-name">{t('itemName')}</label><input className="input" id="custom-name" required maxLength={120} value={customName} disabled={mutation.isPending} onChange={event=>setCustomName(event.target.value)} placeholder={t('itemPlaceholder')}/></div><div className="field"><label htmlFor="custom-category">{t('category')}</label><select id="custom-category" className="select" value={customCategory} disabled={mutation.isPending} onChange={event=>setCustomCategory(event.target.value)}><option value="">{t('other')}</option>{categories.data?.map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></div></>}
      {custom&&<ItemIconPicker value={customIcon} onChange={setCustomIcon} disabled={mutation.isPending}/>}
      <p className="field-label" id="priority-label">{p('label')}</p><div className="priority-options" role="group" aria-labelledby="priority-label">{(['NORMAL','SOON','URGENT'] as Priority[]).map(value=><button type="button" key={value} className={`chip ${priority===value?'active':''}`} aria-pressed={priority===value} disabled={mutation.isPending} onClick={()=>setPriority(value)}>{p(value)}</button>)}</div>
      {mutation.isError&&<ActionError retry={()=>mutation.mutate()} pending={mutation.isPending}/>}
      <button type="submit" className="button full" style={{marginTop:20}} disabled={mutation.isPending||(custom&&!customName.trim())}><PendingLabel pending={mutation.isPending}>{mutation.isPending?common('saving'):common('add')}</PendingLabel></button>
    </form>:<>
      <div className="search-box"><Search aria-hidden="true"/><input className="input" ref={searchRef} aria-label={common('search')} value={search} onChange={event=>setSearch(event.target.value)} placeholder={t('searchPlaceholder')}/></div>
      <div className="chip-scroll" role="group" aria-label={t('category')}><button type="button" className={`chip ${category==='all'?'active':''}`} aria-pressed={category==='all'} onClick={()=>setCategory('all')}>{t('all')}</button>{categories.data?.map(entry=><button type="button" key={entry.id} className={`chip ${category===entry.key?'active':''}`} aria-pressed={category===entry.key} onClick={()=>setCategory(entry.key)}>{entry.name}</button>)}</div>
      {categories.isError&&<ActionError message={common('loadFailed')} retry={()=>void categories.refetch()} pending={categories.isFetching}/>}
      {items.isLoading?<LoadingState rows={3}/>:items.isError?<ErrorState message={common('loadFailed')} retry={()=>void items.refetch()}/>:filtered.length===0?<EmptyState title={t('noResults')} body={t('tryAnotherSearch')}/>:search.trim()?catalog(filtered):<>
        {usual.length>0&&<><h3 className="sheet-section-title"><Star aria-hidden="true"/>{t('usual')}</h3>{catalog(usual)}</>}
        {others.length>0&&<><h3 className="sheet-section-title">{t('categories')}</h3>{catalog(others)}</>}
      </>}
      <button type="button" className="button secondary full" style={{marginTop:18}} onClick={()=>{setCustom(true);setPriority('NORMAL');mutation.reset();}}><Plus aria-hidden="true"/>{t('custom')}</button>
    </>}
  </Sheet>;
}
