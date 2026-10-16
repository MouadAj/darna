'use client';
import {ChevronDown, NotebookPen, Pencil} from 'lucide-react';
import {useEffect, useId, useRef, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslations} from 'next-intl';
import {itemDetailLimits, type ItemStatus} from '@housefamily/shared';
import {api} from '@/lib/api';
import type {Item, ShoppingTrip} from '@/lib/types';
import {ItemVisual} from './item-visual';
import {StatusSelector} from './status-selector';
import {PendingLabel} from './loading';
import {ActionError, Sheet, StatusBadge} from './ui';
import {useToast} from './toast';

type Details = {quantity: string | null; notes: string | null};
export type DetailItem = Pick<Item, 'id'|'name'|'visualKey'|'status'|'quantity'|'notes'>;
export function ItemDetails({quantity, notes}: Details) {
  const t = useTranslations('itemDetails');
  if (!quantity && !notes) return null;
  return <div className="item-details">{quantity && <p className="item-quantity"><span>{t('quantity')}: </span><bdi>{quantity}</bdi></p>}{notes && <p className="item-note" dir="auto">{notes}</p>}</div>;
}

export function ItemDetailsFields({quantity, notes, onChange, disabled = false, expanded = false}: {
  quantity: string; notes: string; onChange: (value: {quantity: string; notes: string}) => void; disabled?: boolean; expanded?: boolean;
}) {
  const t = useTranslations('itemDetails'); const id = useId();
  const [open, setOpen] = useState(expanded || Boolean(quantity || notes));
  return <div className="item-details-fields"><button type="button" className="details-toggle" aria-expanded={open} aria-controls={`${id}-fields`} disabled={disabled} onClick={()=>setOpen(!open)}><NotebookPen aria-hidden="true"/><span>{t('section')}</span><ChevronDown aria-hidden="true" className={open?'is-open':''}/></button>
    <div id={`${id}-fields`} hidden={!open}><p className="form-hint">{t('hint')}</p><div className="field"><label htmlFor={`${id}-quantity`}>{t('quantity')} <span className="optional-label">{t('optional')}</span></label><input id={`${id}-quantity`} className="input" dir="auto" maxLength={itemDetailLimits.quantity} value={quantity} disabled={disabled} onChange={event=>onChange({quantity:event.target.value,notes})} placeholder={t('quantityPlaceholder')}/></div><div className="field"><label htmlFor={`${id}-notes`}>{t('note')} <span className="optional-label">{t('optional')}</span></label><textarea id={`${id}-notes`} className="textarea" dir="auto" rows={3} maxLength={itemDetailLimits.notes} value={notes} disabled={disabled} onChange={event=>onChange({quantity,notes:event.target.value})} placeholder={t('notePlaceholder')}/></div></div>
  </div>;
}

export function ItemDetailSheet({item, onClose, editOnly = false}: {item: DetailItem | null; onClose: () => void; editOnly?: boolean}) {
  return item ? <ItemDetailContent key={item.id} item={item} onClose={onClose} editOnly={editOnly}/> : null;
}
function ItemDetailContent({item, onClose, editOnly}: {item: DetailItem; onClose: () => void; editOnly: boolean}) {
  const t = useTranslations('itemDetails'); const common = useTranslations('common'); const status = useTranslations('status');
  const [editing,setEditing] = useState(editOnly);
  const original = {quantity:item.quantity??'',notes:item.notes??''};
  const formRef=useRef<HTMLFormElement>(null);
  useEffect(()=>{if(editing)formRef.current?.querySelector('input')?.focus();},[editing]);
  const [draft,setDraft] = useState(original); const saving = useRef(false);
  const client = useQueryClient(); const toast = useToast();
  const update = useMutation({mutationFn:(payload: {status: ItemStatus} | Details)=>api<Item>(`/items/${item.id}`,{method:'PATCH',body:JSON.stringify(payload)}),onSuccess:saved=>{
    client.setQueryData<Item[]>(['items'],old=>old?.map(entry=>entry.id===saved.id?saved:entry));
    client.setQueryData<ShoppingTrip|null>(['shopping','active'],old=>old?{...old,items:old.items.map(entry=>entry.item.id===saved.id?{...entry,item:{...entry.item,...saved}}:entry)}:old);
    void client.invalidateQueries({queryKey:['items']});
    void client.invalidateQueries({queryKey:['shopping','active']});
    void client.invalidateQueries({queryKey:['activity']});
    toast.show(editing?t('saved'):status(saved.status)); onClose();
  },onSettled:()=>{saving.current=false;}});
  const submit = (payload: {status: ItemStatus} | Details) => {if(saving.current)return;saving.current=true;update.mutate(payload);};
  const save = () => submit({quantity:draft.quantity.trim()||null,notes:draft.notes.trim()||null});
  const cancel = () => {if(update.isPending)return;update.reset();setDraft(original);if(editOnly)onClose();else setEditing(false);};
  return <Sheet open title={editing?t('editTitle',{name:item.name}):item.name} onClose={onClose} pending={update.isPending}>
    {editing?<form ref={formRef} onSubmit={event=>{event.preventDefault();save();}}><ItemDetailsFields {...draft} onChange={setDraft} disabled={update.isPending} expanded/>{update.isError&&<ActionError retry={save} pending={update.isPending}/>}<div className="details-actions"><button type="button" className="button secondary" disabled={update.isPending} onClick={cancel}>{common('cancel')}</button><button type="submit" className="button" disabled={update.isPending}><PendingLabel pending={update.isPending}>{common(update.isPending?'saving':'save')}</PendingLabel></button></div></form>:<><div className="selected-item"><ItemVisual visualKey={item.visualKey} size="lg"/><StatusBadge status={item.status}/></div><ItemDetails quantity={item.quantity} notes={item.notes}/><StatusSelector value={item.status} disabled={update.isPending} onChange={value=>submit({status:value})}/>{update.isPending&&<p className="form-hint" role="status">{common('saving')}</p>}{update.isError&&<ActionError retry={()=>submit(update.variables!)} pending={update.isPending}/>}<button type="button" className="button secondary full edit-details-action" disabled={update.isPending} onClick={()=>{update.reset();setDraft(original);setEditing(true);}}><Pencil aria-hidden="true"/>{t('edit')}</button></>}
  </Sheet>;
}
