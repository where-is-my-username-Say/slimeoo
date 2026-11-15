import {ITEMS} from './rpg-content.mjs';
const names={sword:'Sword',bow:'Bow',spell:'Spell',armor:'Armor',consumable:'Supply',material:'Material'};
export function itemArtwork(item){
 const paths={
  sword:'<path d="M24 43 46 9 53 8 55 15 33 49Z" fill="currentColor"/><path d="m27 47 22-33" stroke="#fff2cc"/><path d="m17 39 20 14M25 46l-9 13" stroke="#87603d" stroke-width="5"/><path d="m13 58 6 4" stroke="#d7b06a" stroke-width="5"/>',
  bow:'<path d="M17 8Q60 31 17 57" fill="none" stroke="currentColor" stroke-width="5"/><path d="m17 8 8 25-8 24" fill="none" stroke="#ead8b0" stroke-width="1.5"/><path d="M12 33h40m-6-5 7 5-7 5" fill="none" stroke="#7e6144" stroke-width="3"/>',
  spell:'<path d="m19 60 22-43" stroke="#896443" stroke-width="5"/><path d="m42 3 12 14-12 14-12-14Z" fill="currentColor"/><path d="m42 5 4 12-4 12-4-12Z" fill="#fff0c0" opacity=".6"/><path d="m29 24 16 8" stroke="#d0a05e" stroke-width="3"/><path d="m14 16 3-5 3 5-3 5Z" fill="#d0a05e"/>',
  armor:'<path d="m22 10-13 8 5 17 7-3v25h27V32l7 3 5-17-13-8-12 7Z" fill="currentColor" stroke="#6c624e" stroke-width="2"/><path d="M34 18v38M22 40h26" stroke="#e4ce9a" stroke-width="3"/><path d="m24 10 10 9 11-9" fill="none" stroke="#e4ce9a" stroke-width="4"/>',
  consumable:'<path d="M24 10h17v15c0 6 13 13 13 22 0 18-43 18-43 0 0-9 13-16 13-22Z" fill="#c8dcd1" stroke="#728977" stroke-width="2"/><path d="M17 41h31c10 19-41 20-31 0Z" fill="currentColor"/><path d="M22 7h21v9H22Z" fill="#aa8152"/><path d="M21 30v11" stroke="#fff8dd" stroke-width="3" stroke-linecap="round"/>',
  material:'<path d="m31 6 18 17-7 30-20 8-13-27Z" fill="currentColor"/><path d="m31 6-2 29 13 18M9 34l20 1 20-12M29 35l-7 26" fill="none" stroke="#fff4ce" stroke-width="2" opacity=".65"/>'
 };
 return `<svg class="item-art" viewBox="0 0 64 68" aria-hidden="true" style="color:${item.color}">${paths[item.kind]||paths.material}</svg>`;
}
export function itemDetail(c,id){
 const item=ITEMS[id];if(!item)return '<div class="bag-empty">Choose an item to see its details.</div>';
 const equippable=['sword','bow','spell','armor'].includes(item.kind),equipped=equippable?ITEMS[c.gear[item.kind==='armor'?'armor':'weapon']]:null,isEquipped=Object.values(c.gear).includes(id),rank=c.upgrades[id]||0;
 const power=item.power+(rank*(item.kind==='armor'?1:2)),other=equipped?equipped.power+(c.upgrades[equipped.id]||0)*(equipped.kind==='armor'?1:2):0,difference=power-other;
 return `<div class="item-detail-art">${itemArtwork(item)}</div><span class="detail-kind">${names[item.kind]}${equippable?' · Level '+item.level:''}</span><h3>${item.name}${rank?' +'+rank:''}</h3><p>${item.specialty}</p>${equippable?`<dl class="item-stats"><div><dt>${item.kind==='armor'?'Protection':'Power'}</dt><dd>${power}</dd></div><div><dt>Compared with equipped</dt><dd class="${difference>=0?'positive':'negative'}">${difference>0?'+':''}${difference}</dd></div></dl>`:`<dl class="item-stats"><div><dt>In your bag</dt><dd>${c.inventory[id]||0}</dd></div></dl>`}<p class="item-source"><span>Where to find it</span>${item.source}</p>${equippable?`<button class="equip-button" data-equip="${id}" ${isEquipped||c.level<item.level?'disabled':''}>${isEquipped?'Equipped':c.level<item.level?'Requires level '+item.level:'Equip '+names[item.kind].toLowerCase()}</button>`:item.kind==='consumable'?'<button class="equip-button" data-use-tonic>Use tonic</button>':'<div class="material-note">Keep this for crafting or sell it to Scrip.</div>'}`;
}
export function inventoryView(c,mode,selected,filter='all'){
 const all=Object.entries(c.inventory).filter(([id,n])=>n>0&&ITEMS[id]);
 const gear=i=>['sword','bow','spell','armor'].includes(i.kind);
 const list=all.filter(([id])=>(mode!=='equipment'||gear(ITEMS[id]))&&(filter==='all'||filter==='gear'&&gear(ITEMS[id])||filter==='supplies'&&ITEMS[id].kind==='consumable'||filter==='materials'&&ITEMS[id].kind==='material'));
 if(!list.some(([id])=>id===selected))selected=list[0]?.[0];
 const tile=([id,count])=>{const i=ITEMS[id],equipped=Object.values(c.gear).includes(id);return `<button class="bag-slot ${id===selected?'selected':''}" data-item="${id}" aria-pressed="${id===selected}" aria-label="${i.name}${equipped?', equipped':''}"><span class="slot-level">${gear(i)?'LV '+i.level:''}</span>${equipped?'<span class="slot-equipped">E</span>':''}${itemArtwork(i)}<strong>${i.name}</strong>${count>1?`<span class="slot-count">×${count}</span>`:''}</button>`;};
 return {selected,html:`<div class="bag-summary"><span><b>${all.length}</b> / 32 slots</span><span class="bag-gold">◉ ${c.gold} gold</span></div><div class="bag-layout"><section class="bag-contents"><nav class="bag-tabs" aria-label="Item categories">${(mode==='equipment'?['all']:['all','gear','supplies','materials']).map(k=>`<button data-bag-filter="${k}" aria-pressed="${filter===k}">${{all:'All items',gear:'Equipment',supplies:'Supplies',materials:'Materials'}[k]}</button>`).join('')}</nav><div class="inventory">${list.map(tile).join('')}${Array.from({length:Math.max(0,Math.min(16,Math.ceil((list.length+1)/4)*4)-list.length)},()=>'<span class="empty-slot" aria-hidden="true"></span>').join('')}</div><p class="bag-help">Select an item to compare it. Equipped items are marked E.</p></section><aside id="item-detail" class="bag-detail" aria-live="polite">${itemDetail(c,selected)}</aside></div>`};
}
