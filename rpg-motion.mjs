// Match the reference's exponential turn response, taking the short path across ±PI.
// This is presentation only: gameplay aim and server hit directions stay immediate.
export function smoothYaw(current,target,dt,rate=13){
 if(!Number.isFinite(current))return target;
 const turn=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+turn*(1-Math.exp(-rate*Math.max(0,dt)));
}
