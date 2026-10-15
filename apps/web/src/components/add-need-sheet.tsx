'use client';
import {ArrowLeft, Plus, Search, Star} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import type {Priority} from '@housefamily/shared';
import {api} from '@/lib/api';
import type {Category, Item} from '@/lib/types';
import {ItemVisual} from './item-visual';
import {Sheet} from './ui';
import {useToast} from './toast';

export function AddNeedSheet({open, onClose}: {open:boolean;onClose:()=>void}) {
  const t=useTranslations('needs'); const p=useTranslations('priority'); const common=useTranslations('common'); const queryClient=useQueryClient(); const toast=useToast();
  const [search,setSearch]=useState(''); const [category,setCategory]=useState<string>('all'); const [selected,setSelected]=useState<Item|null>(null); const [priority,setPriority]=useState<Priority>('NORMAL'); const [custom,setCustom]=useState(false); const [customName,setCustomName]=useState(''); const [customCategory,setCustomCategory]=useState('');
  const items=useQuery({queryKey:['items'],queryFn:()=>api<Item[]>('/items'),enabled:open});
  const categories=useQuery({queryKey:['categories'],queryFn:()=>api<Category[]>('/categories'),enabled:open});
  const close=()=>{setSelected(null);setCustom(false);setSearch('');setPriority('NORMAL');onClose();};
  const mutation=useMutation({mutationFn:async()=>{
    if(custom) return api('/items',{method:'POST',body:JSON.stringify({name:customName,visualKey:'custom',categoryId:customCategory||undefined,priority})});
    if(!selected) throw new Error('Choose an item');
    return api(`/items/${selected.id}`,{method:'PATCH',body:JSON.stringify({status:'NEEDED',priority})});
  },onSuccess:()=>{void queryClient.invalidateQueries({queryKey:['items']});toast.show(t(custom?'added':'updated'));close();}});
  const filtered=(items.data??[]).filter(item=>(category==='all'||item.category?.key===category)&&item.name.toLowerCase().includes(search.toLowerCase()));
  const view=selected||custom;
  return <Sheet open={open} onClose={close} title={custom?t('customTitle'):t('addTitle')}>
    {view?<div>{selected&&<div className="selected-item"><ItemVisual visualKey={selected.visualKey} size="lg"/><h3>{selected.name}</h3></div>} {custom&&<><button className="back-link" onClick={()=>setCustom(false)}><ArrowLeft/>{common('back')}</button><div className="field"><label htmlFor="custom-name">{t('itemName')}</label><input className="input" id="custom-name" autoFocus value={customName} onChange={event=>setCustomName(event.target.value)} placeholder={t('itemPlaceholder')}/></div><div className="field"><label htmlFor="custom-category">{t('category')}</label><select id="custom-category" className="select" value={customCategory} onChange={event=>setCustomCategory(event.target.value)}><option value="">{t('other')}</option>{categories.data?.map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></div></>}
      <p className="field-label">{p('label')}</p><div className="priority-options">{(['NORMAL','SOON','URGENT'] as Priority[]).map(value=><button key={value} className={`chip ${priority===value?'active':''}`} onClick={()=>setPriority(value)}>{p(value)}</button>)}</div>
      {mutation.isError&&<p className="field-error">{mutation.error.message}</p>}<button className="button full" style={{marginTop:20}} disabled={mutation.isPending||custom&&!customName.trim()} onClick={()=>mutation.mutate()}>{mutation.isPending?'…':common('add')}</button>
    </div>:<><div className="search-box"><Search/><input className="input" value={search} onChange={event=>setSearch(event.target.value)} placeholder={t('searchPlaceholder')}/></div><div className="chip-scroll"><button className={`chip ${category==='all'?'active':''}`} onClick={()=>setCategory('all')}>{t('all')}</button>{categories.data?.map(entry=><button key={entry.id} className={`chip ${category===entry.key?'active':''}`} onClick={()=>setCategory(entry.key)}>{entry.name}</button>)}</div>
      {!search&&<h3 className="sheet-section-title"><Star/> {t('usual')}</h3>}<div className="catalog-grid">{filtered.filter(item=>search||!items.data?.some(candidate=>candidate.usual)&&false||search||item.usual).slice(0,search?30:12).map(item=><button key={item.id} className="catalog-item" onClick={()=>setSelected(item)}><ItemVisual visualKey={item.visualKey}/><span>{item.name}</span></button>)}</div>
      {!search&&<><h3 className="sheet-section-title">{t('categories')}</h3><div className="catalog-grid">{filtered.filter(item=>!item.usual).slice(0,18).map(item=><button key={item.id} className="catalog-item" onClick={()=>setSelected(item)}><ItemVisual visualKey={item.visualKey}/><span>{item.name}</span></button>)}</div></>}{search&&filtered.length===0&&<p className="no-results">{t('noResults')}</p>}
      <button className="button secondary full" style={{marginTop:18}} onClick={()=>setCustom(true)}><Plus/>{t('custom')}</button></>}
  </Sheet>;
}
