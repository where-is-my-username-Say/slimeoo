export class GoogleAccount {
  constructor({guestToken,onChange,onBeforeLogin,onError}){this.guestToken=guestToken;this.onChange=onChange;this.onBeforeLogin=onBeforeLogin;this.onError=onError;this.account=null;this.config=null;this.initialized=false;this.ready=this.load();}
  async api(path,data){const response=await fetch('/api/auth/'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(10000)});let result;try{result=await response.json();}catch{throw Error('The account service is unavailable. Please try again.');}if(!response.ok)throw Error(result.error||'Sign-in could not be completed.');return result;}
  async load(){try{const [config,session]=await Promise.all([this.api('config'),this.api('session')]);this.config=config;this.account=session.account;this.onChange(this.account,{});}catch{this.config={googleEnabled:false,unavailable:true};this.onChange(null,{});}}
  async render(container,status){await this.ready;container.replaceChildren();if(this.account){status.textContent='Google account connected. Your character follows you across devices.';return;}
    if(!this.config?.googleEnabled){status.textContent=this.config?.unavailable?'Account service unavailable. Guest saves still work.':'Google sign-in is not configured on this server. Guest saves still work.';return;}
    if(!this.config.authorizedOrigins?.includes(location.origin)){status.textContent='Google sign-in is configured for the main website. Guest saves work on this local link.';return;}
    if(!window.isSecureContext&&location.hostname!=='localhost'){status.textContent='Open the HTTPS website to use Google sign-in. Guest saves still work here.';return;}
    try{
      if(!window.google?.accounts?.id)await new Promise((resolve,reject)=>{let script=document.querySelector('script[data-slimoo-google]');if(script){script.addEventListener('load',resolve,{once:true});script.addEventListener('error',reject,{once:true});return;}script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.slimooGoogle='true';script.onload=resolve;script.onerror=reject;document.head.append(script);});
      if(!this.initialized){const {nonce}=await this.api('nonce',{});window.google.accounts.id.initialize({client_id:this.config.clientId,nonce,auto_select:false,callback:credential=>this.login(credential.credential)});this.initialized=true;}
      window.google.accounts.id.renderButton(container,{theme:'outline',size:'large',text:'continue_with',shape:'pill',width:Math.min(280,Math.max(220,container.clientWidth||280))});status.textContent='Sign in to keep this character on your Google account. Guest play is available below.';
    }catch{status.textContent='Google could not load. Reload to try again, or continue as a guest.';}
  }
  async login(credential){try{this.onBeforeLogin();const result=await this.api('google',{credential,guestToken:this.guestToken()});this.account=result.account;this.onChange(this.account,result);}catch(error){this.onError(error.message);}}
  async ticket(){await this.ready;if(!this.account)return {};const result=await this.api('ticket',{});return {authTicket:result.ticket,characterToken:undefined};}
  async logout(){await this.api('logout',{});window.google?.accounts?.id.disableAutoSelect();this.account=null;this.onChange(null,{logout:true});}
}
