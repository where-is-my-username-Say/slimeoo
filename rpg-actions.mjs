// Stable wire codes: 1–3 remain compatible with the original meadow protocol.
export const ACTION_NAMES=['','slap','spit','nova','sword','bow'];
export const ACTION_CODES=Object.fromEntries(ACTION_NAMES.map((name,code)=>[name,code]));
export function actionTiming(kind,combo=0){
  if(kind==='slap')return {duration:[.36,.39,.54][combo%3],contact:combo%3===2?.25:.18};
  if(kind==='spit')return {duration:.34,contact:.14};
  if(kind==='sword')return {duration:.62,contact:.24};
  if(kind==='bow')return {duration:.86,contact:.31};
  return {duration:1,contact:.40};
}
export function poseAction(p,now){
  if(!p)return null;
  const remaining=Math.max(0,p.attackTime-Math.max(0,now-(p.receivedAt??now))/1000);
  return remaining>0?{kind:ACTION_NAMES[p.attack]||'',remaining,duration:p.duration,combo:p.combo||0}:null;
}
