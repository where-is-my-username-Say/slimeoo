// Google identity is verified on the server. No Google client secret is needed
// for the GIS ID-token flow, and no Google token is stored by the browser.
export class AuthError extends Error {
  constructor(message,status=401){super(message);this.status=status;}
}
const text=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
export const opaque=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const hash=async value=>hex(await crypto.subtle.digest('SHA-256',text.encode(value)));
const decode=part=>{try{const raw=atob(part.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}catch{throw new AuthError('Invalid Google credential.');}};
let keyCache={keys:[],expires:0,refreshed:0};
let keyRequest=null;
async function googleKeys(fetcher,now){
  if(keyCache.expires>now)return keyCache.keys;
  if(keyRequest)return keyRequest;
  keyRequest=(async()=>{
  const response=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new AuthError('Google verification is temporarily unavailable. Please try again.',503);
  const json=await response.json();if(!Array.isArray(json.keys))throw new AuthError('Google verification is unavailable.',503);
  const ttl=Math.min(3600,Number(/max-age=(\d+)/.exec(response.headers.get('cache-control')||'')?.[1])||300);
  keyCache={keys:json.keys,expires:now+ttl*1000,refreshed:now};return json.keys;
  })();try{return await keyRequest;}finally{keyRequest=null;}
}
export async function verifyGoogleIdToken(credential,clientId,nonce,{fetcher=fetch,now=Date.now(),keys}={}){
  if(typeof credential!=='string'||credential.length>12000)throw new AuthError('Invalid Google credential.');
  const parts=credential.split('.');if(parts.length!==3)throw new AuthError('Invalid Google credential.');
  let header,claims;try{header=JSON.parse(new TextDecoder().decode(decode(parts[0])));claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));}catch{throw new AuthError('Invalid Google credential.');}
  if(!header||typeof header!=='object'||Array.isArray(header)||!claims||typeof claims!=='object'||Array.isArray(claims))throw new AuthError('Invalid Google credential.');
  if(header.alg!=='RS256'||typeof header.kid!=='string')throw new AuthError('Google credential signature is not supported.');
  let available=keys||await googleKeys(fetcher,now),jwk=available.find(k=>k.kid===header.kid&&k.kty==='RSA');
  if(!jwk&&!keys&&now-keyCache.refreshed>60000){keyCache.expires=0;available=await googleKeys(fetcher,now);jwk=available.find(k=>k.kid===header.kid&&k.kty==='RSA');}
  if(!jwk)throw new AuthError('Google credential signature could not be verified.');
  let valid=false;try{const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),text.encode(parts[0]+'.'+parts[1]));}catch{}
  if(!valid)throw new AuthError('Google credential signature could not be verified.');
  const seconds=now/1000,audience=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(!audience.includes(clientId)||((audience.length>1||claims.azp)&&claims.azp!==clientId))throw new AuthError('This Google login belongs to another application.');
  if(!['accounts.google.com','https://accounts.google.com'].includes(claims.iss))throw new AuthError('Invalid Google issuer.');
  if(!Number.isFinite(claims.exp)||claims.exp<=seconds||!Number.isFinite(claims.iat)||claims.iat>seconds+60)throw new AuthError('Google login expired. Sign in again.');
  if(typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255)throw new AuthError('Google account could not be identified.');
  if(!nonce||claims.nonce!==nonce)throw new AuthError('Google login challenge did not match. Reload and try again.');
  if(claims.email&&claims.email_verified!==true)throw new AuthError('A verified Google account is required.');
  return {sub:claims.sub,name:typeof claims.name==='string'?claims.name.slice(0,80):'Google player',email:typeof claims.email==='string'?claims.email.slice(0,254):''};
}
function cookieValue(request,key){const raw=request.headers.get('cookie')||'';return raw.split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='))?.slice(key.length+1)||'';}
const json=(data,status=200,cookies=[])=>{const headers=new Headers({'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});for(const c of cookies)headers.append('Set-Cookie',c);return new Response(JSON.stringify(data),{status,headers});};
const SESSION_COOKIE='slimoo_session',NONCE_COOKIE='slimoo_login';
function cookie(request,name,value,seconds){const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return `${name}=${value}; Path=/; Max-Age=${seconds}; HttpOnly; SameSite=Lax${secure}`;}
async function body(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new AuthError('JSON body required.',415);
  const reader=request.body?.getReader();if(!reader)throw new AuthError('Request body required.',400);let value='',size=0;const decoder=new TextDecoder();
  while(true){const {value:chunk,done}=await reader.read();if(done)break;size+=chunk.byteLength;if(size>16000){await reader.cancel();throw new AuthError('Request too large.',413);}value+=decoder.decode(chunk,{stream:true});}value+=decoder.decode();
  try{return JSON.parse(value);}catch{throw new AuthError('Invalid request.',400);}
}
export class AccountAuth {
  constructor(storage,env,{verify=verifyGoogleIdToken,now=()=>Date.now(),revoke=()=>{},bind=()=>{},serialize}={}){this.storage=storage;this.env=env;this.verify=verify;this.now=now;this.revoke=revoke;this.bind=bind;this.queue=Promise.resolve();this.serialize=serialize||(fn=>{const work=this.queue.then(fn);this.queue=work.catch(()=>{});return work;});}
  async session(request){const token=cookieValue(request,SESSION_COOKIE);if(!/^[a-f0-9]{64}$/.test(token))return null;const sessionHash=await hash(token),record=await this.storage.get('auth:session:'+sessionHash);if(!record)return null;if(record.expiresAt<=this.now()){await this.storage.delete('auth:session:'+sessionHash);return null;}return {...record,sessionHash};}
  async summary(record){const character=await this.storage.get(record.characterKey);return {provider:'google',name:record.name,email:record.email,character:character?{name:character.name,color:character.color,level:character.level,kills:character.kills,revision:character.revision,updatedAt:character.updatedAt||character.createdAt}:null};}
  async consumeTicket(ticket){if(typeof ticket!=='string'||!/^[a-f0-9]{64}$/.test(ticket))throw new AuthError('Sign in again to load your Google save.');const key='auth:ticket:'+await hash(ticket),record=await this.storage.get(key);if(!record)throw new AuthError('Login ticket expired. Sign in again.');await this.storage.delete(key);const session=await this.storage.get('auth:session:'+record.sessionHash);if(record.expiresAt<=this.now()||!session||session.expiresAt<=this.now())throw new AuthError('Sign in again to load your Google save.');return {characterKey:session.characterKey,sessionHash:record.sessionHash,expiresAt:session.expiresAt};}
  async handle(request){try{
    const path=new URL(request.url).pathname;
    if(request.method==='POST'){const allowed=new Set([new URL(request.url).origin,this.env.PUBLIC_SITE_ORIGIN||'https://slimeoo-plum.vercel.app']);if(!allowed.has(request.headers.get('Origin')))throw new AuthError('Sign in from the Slimoo website.',403);}
    if(path==='/api/auth/config'&&request.method==='GET')return json({googleEnabled:!!this.env.GOOGLE_CLIENT_ID,clientId:this.env.GOOGLE_CLIENT_ID||'',provider:'google',authorizedOrigins:(this.env.GOOGLE_ORIGINS||this.env.PUBLIC_SITE_ORIGIN||'https://slimeoo-plum.vercel.app').split(',').map(s=>s.trim())});
    if(path==='/api/auth/session'&&request.method==='GET'){const session=await this.session(request);return json({account:session?await this.summary(session):null});}
    if(path==='/api/auth/nonce'&&request.method==='POST'){
      if(!this.env.GOOGLE_CLIENT_ID)throw new AuthError('Google sign-in is not configured on this server.',503);
      const nonce=opaque();await this.storage.put('auth:nonce:'+await hash(nonce),{expiresAt:this.now()+600000});
      return json({nonce},200,[cookie(request,NONCE_COOKIE,nonce,600)]);
    }
    if(path==='/api/auth/google'&&request.method==='POST'){
      if(!this.env.GOOGLE_CLIENT_ID)throw new AuthError('Google sign-in is not configured on this server.',503);
      const data=await body(request),nonce=cookieValue(request,NONCE_COOKIE),nonceKey='auth:nonce:'+await hash(nonce),challenge=await this.storage.get(nonceKey);
      if(!nonce||!challenge||challenge.expiresAt<=this.now())throw new AuthError('Login challenge expired. Reload and try again.');
      const identity=await this.verify(data.credential,this.env.GOOGLE_CLIENT_ID,nonce,{now:this.now()});
      return await this.serialize(async()=>{
      const fresh=await this.storage.get(nonceKey);if(!fresh||fresh.expiresAt<=this.now())throw new AuthError('Login challenge expired. Reload and try again.');
      await this.storage.delete(nonceKey);
      const accountKey='auth:google:'+await hash(identity.sub);let account=await this.storage.get(accountKey),linkedGuest=false,preservedGuest=false;
      const guestKey=typeof data.guestToken==='string'&&/^slm_[a-f0-9]{64}$/.test(data.guestToken)?'character:'+await hash(data.guestToken):null;
      const guest=guestKey?await this.storage.get(guestKey):null;
      if(!account){const binding=guestKey?await this.storage.get('auth:binding:'+guestKey):null;const characterKey=guest&&!binding?guestKey:'character:google:'+await hash(identity.sub);linkedGuest=characterKey===guestKey;account={characterKey,createdAt:this.now()};}
      else preservedGuest=!!guest&&guestKey!==account.characterKey;
      account.name=identity.name;account.email=identity.email;
      const sessionToken=opaque(),sessionHash=await hash(sessionToken),record={...account,expiresAt:this.now()+7*24*3600000};
      await this.storage.transaction(async txn=>{await txn.put({[accountKey]:account,['auth:binding:'+account.characterKey]:accountKey,['auth:session:'+sessionHash]:record});});
      if(linkedGuest)this.bind(account.characterKey);
      return json({account:await this.summary(record),linkedGuest,preservedGuest,guestLinked:guestKey===account.characterKey},200,[cookie(request,SESSION_COOKIE,sessionToken,7*24*3600),cookie(request,NONCE_COOKIE,'',0)]);
      });
    }
    if(path==='/api/auth/ticket'&&request.method==='POST'){
      const session=await this.session(request);if(!session)throw new AuthError('Google session expired. Sign in again.');const ticket=opaque();await this.storage.put('auth:ticket:'+await hash(ticket),{sessionHash:session.sessionHash,expiresAt:this.now()+30000});return json({ticket,expiresIn:30});
    }
    if(path==='/api/auth/logout'&&request.method==='POST'){
      return await this.serialize(async()=>{
      const session=await this.session(request);if(session){await this.storage.delete('auth:session:'+session.sessionHash);this.revoke(session.sessionHash);}return json({ok:true},200,[cookie(request,SESSION_COOKIE,'',0),cookie(request,NONCE_COOKIE,'',0)]);
      });
    }
    return json({error:'not_found'},404);
  }catch(error){return json({error:error instanceof AuthError?error.message:'Sign-in could not be completed. Please try again.'},error instanceof AuthError?error.status:503);}}
}
