'use client';

import {Check, ChevronDown} from 'lucide-react';
import {useId, useState} from 'react';
import {useTranslations} from 'next-intl';
import {ItemVisual, selectableItemIcons, type SelectableItemIcon} from './item-visual';

export function ItemIconPicker({value,onChange,disabled=false}: {
  value: SelectableItemIcon;
  onChange: (value: SelectableItemIcon) => void;
  disabled?: boolean;
}) {
  const t=useTranslations('itemIcons');
  const [expanded,setExpanded]=useState(false);
  const id=useId();

  return <fieldset className="item-icon-picker" disabled={disabled}>
    <legend className="field-label">{t('label')}</legend>
    <div className="item-icon-preview">
      <ItemVisual visualKey={value}/><span>{t(`options.${value}`)}</span>
      <button type="button" className="text-button item-icon-toggle" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(open=>!open)}>
        {t(expanded?'hide':'choose')}<ChevronDown aria-hidden="true"/>
      </button>
    </div>
    <div id={id} className="item-icon-grid" hidden={!expanded}>
      {selectableItemIcons.map(key=><label className="item-icon-option" key={key}>
        <input type="radio" className="sr-only" name={`${id}-icon`} value={key} checked={value===key} onChange={()=>onChange(key)}/>
        <span className="item-icon-option-body"><Check className="item-icon-selected" aria-hidden="true"/><ItemVisual visualKey={key} size="sm"/><span>{t(`options.${key}`)}</span></span>
      </label>)}
    </div>
  </fieldset>;
}
