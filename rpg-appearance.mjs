export const ORIGINAL_COLORS=['#29977c','#b95750','#7253a6','#a17b26'];
export const DEFAULT_APPEARANCE=Object.freeze({size:1,width:1,height:1,hands:1,eyes:1,crown:true,blush:true,showGear:false,tint:'#29977c'});
export function sanitizeAppearance(value={},color=0){
 const source=value&&typeof value==='object'?value:{};
 const bounded=(key,min,max)=>Number.isFinite(Number(source[key]))?Math.max(min,Math.min(max,Number(source[key]))):1;
 return {size:bounded('size',.8,1.3),width:bounded('width',.85,1.2),height:bounded('height',.85,1.2),hands:bounded('hands',.8,1.3),eyes:bounded('eyes',.85,1.2),crown:source.crown!==false,blush:source.blush!==false,showGear:source.showGear===true,tint:/^#[a-f\d]{6}$/i.test(source.tint||'')?source.tint.toLowerCase():ORIGINAL_COLORS[color]||ORIGINAL_COLORS[0]};
}
