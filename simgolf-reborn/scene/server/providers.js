import {createRemoteJWKSet,jwtVerify,decodeJwt,importPKCS8,SignJWT} from 'jose';
import {challenge,fail} from './security.js';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const microsoftKeys=createRemoteJWKSet(new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys'));
const appleKeys=createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
export function providers(env){return [
 {id:'google',name:'Google',enabled:!!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET)},
 {id:'apple',name:'Apple',enabled:!!(env.APPLE_CLIENT_ID&&env.APPLE_TEAM_ID&&env.APPLE_KEY_ID&&env.APPLE_PRIVATE_KEY)},
 {id:'github',name:'GitHub',enabled:!!(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET)},
 {id:'microsoft',name:'Microsoft',enabled:!!(env.MICROSOFT_CLIENT_ID&&env.MICROSOFT_CLIENT_SECRET)},
 {id:'email',name:'Email code',enabled:!!(env.EMAIL&&env.EMAIL_FROM)}
];}
export function callback(env,id){return `${env.APP_ORIGIN}/api/auth/${id}/callback`;}
export async function authorization(env,id,t){
 const url=new URL({microsoft:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',google:'https://accounts.google.com/o/oauth2/v2/auth',github:'https://github.com/login/oauth/authorize',apple:'https://appleid.apple.com/auth/authorize'}[id]);
 url.search=new URLSearchParams({client_id:env[`${id.toUpperCase()}_CLIENT_ID`],redirect_uri:callback(env,id),response_type:'code',state:t.state,scope:id==='github'?'read:user user:email':'openid email profile'}).toString();
 if(id==='apple'){url.searchParams.set('scope','name email');url.searchParams.set('response_mode','form_post');}
 else{url.searchParams.set('code_challenge',await challenge(t.verifier));url.searchParams.set('code_challenge_method','S256');}
 if(id!=='github')url.searchParams.set('nonce',t.nonce);
 return url.toString();
}
async function upstream(url,options={}){
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw fail(502,'The sign-in provider could not complete this request.');
 return response.json();
}
export async function identity(env,id,code,t){
 let secret=env[`${id.toUpperCase()}_CLIENT_SECRET`];
 if(id==='apple')secret=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:env.APPLE_KEY_ID}).setIssuer(env.APPLE_TEAM_ID).setAudience('https://appleid.apple.com').setSubject(env.APPLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(await importPKCS8(env.APPLE_PRIVATE_KEY,'ES256'));
 const auth=await upstream({microsoft:'https://login.microsoftonline.com/common/oauth2/v2.0/token',google:'https://oauth2.googleapis.com/token',apple:'https://appleid.apple.com/auth/token',github:'https://github.com/login/oauth/access_token'}[id],{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:new URLSearchParams({client_id:env[`${id.toUpperCase()}_CLIENT_ID`],client_secret:secret,code,grant_type:'authorization_code',redirect_uri:callback(env,id),...(id==='apple'?{}:{code_verifier:t.verifier})})});
 if(id==='github'){
  if(typeof auth.access_token!=='string')throw fail(401,'GitHub sign-in failed.');
  const headers={authorization:`Bearer ${auth.access_token}`,accept:'application/vnd.github+json','user-agent':'SimGolfer','X-GitHub-Api-Version':'2022-11-28'};
  const user=await upstream('https://api.github.com/user',{headers}),emails=await upstream('https://api.github.com/user/emails',{headers});
  const email=Array.isArray(emails)?emails.find(e=>e.primary&&e.verified)?.email:undefined;
  if(!Number.isSafeInteger(user.id)||!email)throw fail(401,'GitHub must provide a verified email address.');
  return {subject:String(user.id),email,name:user.name||user.login};
 }
 let issuer=id==='apple'?'https://appleid.apple.com':['https://accounts.google.com','accounts.google.com'];
 if(id==='microsoft'){
  const tid=decodeJwt(auth.id_token).tid;
  if(typeof tid!=='string'||!/^[-a-f0-9]{36}$/i.test(tid))throw fail(401,'Invalid Microsoft tenant.');
  issuer=`https://login.microsoftonline.com/${tid}/v2.0`;
 }
 const {payload:p}=await jwtVerify(auth.id_token,id==='apple'?appleKeys:id==='microsoft'?microsoftKeys:googleKeys,{issuer,audience:env[`${id.toUpperCase()}_CLIENT_ID`],algorithms:['RS256'],requiredClaims:['exp','iat','sub','nonce']});
 if(p.nonce!==t.nonce||typeof p.sub!=='string'||!p.sub||typeof p.email!=='string'||(id!=='microsoft'&&![true,'true'].includes(p.email_verified)))throw fail(401,'A verified identity with an email address is required.');
 // Microsoft's email is contact metadata, not an authorization or linking key.
 if(id==='microsoft')return {subject:p.iss+'|'+p.sub,email:p.email,name:p.name||'Golfer'};
 return {subject:p.sub,email:p.email,name:p.name||p.email.split('@')[0]};
}
