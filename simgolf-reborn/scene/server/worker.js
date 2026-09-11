import {requirePermanentEmail} from './email-policy.js';
import {providers,authorization,identity} from './providers.js';
import {token,hash,cookie,names,setCookie,json,fail,sameOrigin,readJson,readText,rateLimit} from './security.js';
import {createSharedCourse,getSharedCourse,listSharedCourses,setCourseMember,executeSharedCommand} from './shared-courses.js';
const TTL=30*24*60*60;
async function session(request,env){
 const value=cookie(request,names.session);if(!value)return null;
 return env.DB.prepare('SELECT p.id,p.name,p.email,p.role,s.csrf,s.expires_at FROM sessions s JOIN players p ON p.id=s.player_id WHERE s.token_hash=? AND s.expires_at>? AND p.disabled_at IS NULL').bind(await hash(value),Date.now()).first();
}
async function login(env,provider,user,linkPlayer){
 requirePermanentEmail(user.email);
 if(linkPlayer){
  const existing=await env.DB.prepare('SELECT player_id FROM identities WHERE provider=? AND subject=?').bind(provider,user.subject).first();
  if(existing && existing.player_id!==linkPlayer)throw fail(409,'This sign-in already belongs to another player.');
  await env.DB.prepare('INSERT INTO identities(provider,subject,player_id) VALUES (?,?,?) ON CONFLICT DO NOTHING').bind(provider,user.subject,linkPlayer).run();
 }
 const candidate=crypto.randomUUID(),now=Date.now();
 await env.DB.batch([
  env.DB.prepare('INSERT INTO players(id,name,email,created_at) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM identities WHERE provider=? AND subject=?)').bind(candidate,String(user.name||'Golfer').slice(0,80),user.email.slice(0,254),now,provider,user.subject),
  env.DB.prepare('INSERT INTO identities(provider,subject,player_id) SELECT ?,?,id FROM players WHERE id=? ON CONFLICT(provider,subject) DO NOTHING').bind(provider,user.subject,candidate),
  env.DB.prepare('DELETE FROM players WHERE id=? AND NOT EXISTS(SELECT 1 FROM identities WHERE player_id=?)').bind(candidate,candidate)
 ]);
 const player=await env.DB.prepare('SELECT player_id FROM identities WHERE provider=? AND subject=?').bind(provider,user.subject).first();
 const active=await env.DB.prepare('SELECT id FROM players WHERE id=? AND disabled_at IS NULL').bind(player.player_id).first();if(!active)throw fail(403,'This account is suspended.');
 if(linkPlayer && player.player_id!==linkPlayer)throw fail(409,'Provider already connected elsewhere.');
 const value=token();await env.DB.prepare('INSERT INTO sessions(token_hash,player_id,csrf,expires_at) VALUES (?,?,?,?)').bind(await hash(value),player.player_id,token(),now+TTL*1000).run();
 return setCookie(names.session,value,TTL);
}
function redirect(url,cookies=[]){const headers=new Headers({location:url,'cache-control':'no-store','referrer-policy':'no-referrer'});for(const c of cookies)headers.append('set-cookie',c);return new Response(null,{status:303,headers});}
async function handle(request,env){
 const url=new URL(request.url),path=url.pathname;
 // Public login assets contain no player data. All game HTML and APIs require a session.
 if(['/login','/login.html','/privacy','/privacy.html'].includes(path)||path.startsWith('/assets/')||path==='/favicon.ico')return env.ASSETS.fetch(request);
 if(!env.DB)throw fail(503,'Account service is being configured. Please try again later.');
 if(path==='/api/auth/providers')return json({providers:providers(env).filter(p=>p.enabled).map(({id,name})=>({id,name}))});
 const oauth=path.match(/^\/api\/auth\/(google|github|apple|microsoft)\/(start|link|callback)$/);
 if(oauth){
  const [,id,action]=oauth;
  if(!providers(env).some(p=>p.id===id&&p.enabled))throw fail(503,'This sign-in provider is not configured yet.');
  if(action==='start'||action==='link'){
   if(request.method!==(action==='link'?'POST':'GET'))throw fail(405,'Method not allowed.');
   await rateLimit(env.DB,'oauth:'+await hash(request.headers.get('cf-connecting-ip')||'unknown'),30,600);
   let linking=null;
   if(action==='link'){sameOrigin(request,env);linking=await session(request,env);if(!linking||request.headers.get('x-csrf-token')!==linking.csrf)throw fail(403,'Sign in before connecting another provider.');}
   const t={state:token(),verifier:token(),nonce:token()};
   await env.DB.prepare('INSERT INTO transactions(state_hash,provider,verifier,nonce,link_player,link_session,expires_at) VALUES (?,?,?,?,?,?,?)').bind(await hash(t.state),id,t.verifier,t.nonce,linking?.id||null,linking?await hash(cookie(request,names.session)):null,Date.now()+600000).run();
   const target=await authorization(env,id,t),transactionCookie=setCookie(names.oauth,t.state,600,id==='apple'?'None':'Lax');
   return linking?json({url:target},200,{'set-cookie':transactionCookie}):redirect(target,[transactionCookie]);
  }
  if(request.method!==(id==='apple'?'POST':'GET'))throw fail(405,'Method not allowed.');
  let params=url.searchParams;
  if(id==='apple'){
   const body=await readText(request,10000);params=new URLSearchParams(body);
  }
  const state=params.get('state'),code=params.get('code');
  if(!state||state.length>128||state!==cookie(request,names.oauth)||!code||code.length>4096)return redirect('/login.html?error=signin');
  const t=await env.DB.prepare('DELETE FROM transactions WHERE state_hash=? AND provider=? AND expires_at>? RETURNING *').bind(await hash(state),id,Date.now()).first();
  if(!t)return redirect('/login.html?error=signin');
  if(t.link_player && !await env.DB.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND player_id=? AND expires_at>?').bind(t.link_session,t.link_player,Date.now()).first())return redirect('/login.html?error=signin');
  try{return redirect('/',[await login(env,id,await identity(env,id,code,t),t.link_player),setCookie(names.oauth,'',0,id==='apple'?'None':'Lax')]);}
  catch(error){return redirect('/login.html?error='+(error.message?.startsWith('Temporary email')?'email-policy':'signin'),[setCookie(names.oauth,'',0,id==='apple'?'None':'Lax')]);}
 }
 if(path==='/api/auth/email/start'){
  if(request.method!=='POST')throw fail(405,'Method not allowed.');sameOrigin(request,env);
  if(!env.EMAIL||!env.EMAIL_FROM)throw fail(503,'Email sign-in is not configured yet.');
  const body=await readJson(request),email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw fail(400,'Enter a valid email address.');
  requirePermanentEmail(email);
  await rateLimit(env.DB,'mailip:'+await hash(request.headers.get('cf-connecting-ip')||'unknown'),10,600);
  await rateLimit(env.DB,'mail:'+await hash(email),3,600);
  const id=token(),browser=token(),code=String(crypto.getRandomValues(new Uint32Array(1))[0]%100000000).padStart(8,'0');
  await env.DB.prepare('INSERT INTO email_codes(id,email,code_hash,browser_hash,expires_at) VALUES (?,?,?,?,?)').bind(id,email,await hash(id+code),await hash(browser),Date.now()+600000).run();
  try{await env.EMAIL.send({to:email,from:{email:env.EMAIL_FROM,name:'SimGolfer'},subject:'Your SimGolfer sign-in code',text:`Your SimGolfer code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.`,html:`<p>Your SimGolfer code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this code, ignore this email.</p>`});}
  catch{await env.DB.prepare('DELETE FROM email_codes WHERE id=?').bind(id).run();throw fail(503,'The code could not be sent. Please try again later.');}
  return json({id},200,{'set-cookie':setCookie(names.email,browser,600)});
 }
 if(path==='/api/auth/email/verify'){
  if(request.method!=='POST')throw fail(405,'Method not allowed.');sameOrigin(request,env);
  const {id,code}=await readJson(request),browser=cookie(request,names.email);
  if(typeof id!=='string'||id.length!==64||typeof code!=='string'||!/^\d{8}$/.test(code)||!browser)throw fail(401,'Invalid or expired code.');
  const row=await env.DB.prepare('UPDATE email_codes SET attempts=attempts+1 WHERE id=? AND browser_hash=? AND expires_at>? AND attempts<5 RETURNING *').bind(id,await hash(browser),Date.now()).first();
  if(!row||row.code_hash!==await hash(id+code))throw fail(401,'Invalid or expired code.');
  const consumed=await env.DB.prepare('DELETE FROM email_codes WHERE id=? RETURNING email').bind(id).first();
  if(!consumed)throw fail(401,'This code has already been used.');
  return json({ok:true},200,{'set-cookie':await login(env,'email',{subject:row.email,email:row.email,name:row.email.split('@')[0]})});
 }
 const user=await session(request,env);
 if(path==='/api/auth/me')return user?json({user:{id:user.id,name:user.name,email:user.email,role:user.role},csrf:user.csrf,expiresAt:user.expires_at}):json({user:null},401);
 if(!user)return path.startsWith('/api/')?json({error:'Sign in to continue.'},401):redirect('/login.html');
 if(request.headers.has('x-player-id')&&request.headers.get('x-player-id')!==user.id)throw fail(409,'The signed-in account changed. Reload before continuing.');
 if(path.startsWith('/api/')&&!['GET','HEAD'].includes(request.method)){
  sameOrigin(request,env);if(request.headers.get('x-csrf-token')!==user.csrf)throw fail(403,'Please reload before trying again.');
 }
 if(path==='/api/auth/logout'&&request.method==='POST'){
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(cookie(request,names.session))).run();
  return json({ok:true},200,{'set-cookie':setCookie(names.session,'',0)});
 }
 if(path.startsWith('/api/admin/')){
  if(user.role!=='admin')throw fail(403,'Administrator access required.');
  if(path==='/api/admin/players'&&request.method==='GET'){
   const q=(url.searchParams.get('q')||'').slice(0,100),offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
   const rows=await env.DB.prepare('SELECT id,name,email,role,disabled_at,created_at FROM players WHERE email LIKE ? OR name LIKE ? ORDER BY created_at DESC,id LIMIT 50 OFFSET ?').bind('%'+q+'%','%'+q+'%',offset).all();return json({players:rows.results});
  }
  const action=path.match(/^\/api\/admin\/players\/([a-f0-9-]{36})\/(suspend|restore|revoke-sessions)$/);
  if(action&&request.method==='POST'){
   const [,id,operation]=action;if(id===user.id)throw fail(400,'You cannot suspend or revoke your own administrator account here.');
   if(!await env.DB.prepare('SELECT id FROM players WHERE id=?').bind(id).first())throw fail(404,'Player not found.');
   const tasks=[];
   if(operation==='suspend')tasks.push(env.DB.prepare('UPDATE players SET disabled_at=? WHERE id=?').bind(Date.now(),id));
   if(operation==='restore')tasks.push(env.DB.prepare('UPDATE players SET disabled_at=NULL WHERE id=?').bind(id));
   if(operation!=='restore')tasks.push(env.DB.prepare('DELETE FROM sessions WHERE player_id=?').bind(id));
   tasks.push(env.DB.prepare('INSERT INTO admin_actions(actor_id,target_id,action,created_at) VALUES (?,?,?,?)').bind(user.id,id,operation,Date.now()));
   await env.DB.batch(tasks);return json({ok:true});
  }
  throw fail(404,'Administration action not found.');
 }
 if(path==='/api/account'&&request.method==='DELETE'){
  const body=await readJson(request);if(body.confirm!=='DELETE')throw fail(400,'Account deletion must be confirmed.');
  await env.DB.batch([
   env.DB.prepare('DELETE FROM course_members WHERE player_id=? OR course_id IN (SELECT id FROM shared_courses WHERE owner_id=?)').bind(user.id,user.id),
   env.DB.prepare('DELETE FROM shared_courses WHERE owner_id=?').bind(user.id),
   ...['saves','sessions','identities'].map(table=>env.DB.prepare(`DELETE FROM ${table} WHERE player_id=?`).bind(user.id)),env.DB.prepare('DELETE FROM players WHERE id=?').bind(user.id)
  ]);
  return json({ok:true},200,{'set-cookie':setCookie(names.session,'',0)});
 }
 if(path==='/api/courses'){
  if(request.method==='GET')return json({courses:await listSharedCourses(env.DB,user.id)});
  if(request.method==='POST'){
   await rateLimit(env.DB,'course-create:'+user.id,5,3600);
   const body=await readJson(request,1000);if(Object.keys(body).some(k=>k!=='name'))throw fail(400,'Only a course name can be supplied.');
   return json(await createSharedCourse(env.DB,user.id,body.name),201);
  }
 }
 const shared=path.match(/^\/api\/courses\/([a-f0-9-]{36})(?:\/(commands|members))?$/);
 if(shared){
  const [,id,action]=shared;
  if(!action&&request.method==='GET')return json(await getSharedCourse(env.DB,id,user.id));
  if(action==='commands'&&request.method==='POST'){
   await rateLimit(env.DB,'course-command:'+user.id,120,60);
   return json(await executeSharedCommand(env.DB,id,user.id,await readJson(request,20000)));
  }
  if(action==='members'&&request.method==='PUT'){
   const body=await readJson(request,1000);
   if(typeof body.playerId!=='string'||!/^[-a-f0-9]{36}$/.test(body.playerId))throw fail(400,'A player ID is required.');
   await setCourseMember(env.DB,id,user.id,body.playerId,body.role);return json({ok:true});
  }
 }
 const save=path.match(/^\/api\/saves\/([a-z0-9-]{1,24})$/);
 if(save){
  const slot=save[1];
  if(request.method==='GET'){
   const row=await env.DB.prepare('SELECT body,revision,updated_at FROM saves WHERE player_id=? AND slot=?').bind(user.id,slot).first();
   return row?json({data:JSON.parse(row.body),revision:row.revision,updatedAt:row.updated_at}):json({data:null,revision:0});
  }
  if(request.method==='PUT'){
   await rateLimit(env.DB,'save:'+user.id,120,60);
   const data=await readJson(request,750000),expected=Number(request.headers.get('if-match'));
   if(request.headers.get('if-match')===null||!Number.isSafeInteger(expected)||expected<0)throw fail(428,'A save revision is required.');
   const body=JSON.stringify(data),row=await env.DB.prepare('INSERT INTO saves(player_id,slot,body,revision,updated_at) SELECT ?,?,?,1,? WHERE ?=0 ON CONFLICT(player_id,slot) DO UPDATE SET body=excluded.body,revision=saves.revision+1,updated_at=excluded.updated_at WHERE saves.revision=? RETURNING revision').bind(user.id,slot,body,Date.now(),expected,expected).first();
   // Existing saves need UPDATE because INSERT's WHERE excludes nonzero revisions.
   if(row)return json({revision:row.revision});
   if(expected>0){const updated=await env.DB.prepare('UPDATE saves SET body=?,revision=revision+1,updated_at=? WHERE player_id=? AND slot=? AND revision=? RETURNING revision').bind(body,Date.now(),user.id,slot,expected).first();if(updated)return json({revision:updated.revision});}
   throw fail(409,'A newer cloud save exists. Load it before saving again.');
  }
 }
 if(path.startsWith('/api/'))throw fail(404,'Not found.');
 const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);headers.set('cache-control','private, no-store');headers.set('referrer-policy','same-origin');return new Response(response.body,{status:response.status,headers});
}
export async function cleanup(env){
 const now=Date.now();
 // A D1 lease prevents concurrent visitors/isolates from repeating daily work.
 const claimed=await env.DB.prepare("INSERT INTO rate_limits(key,count,expires_at) VALUES ('maintenance',1,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at WHERE rate_limits.expires_at<=? RETURNING key").bind(now+86400000,now).first();
 if(claimed)await env.DB.batch(['sessions','transactions','email_codes','rate_limits'].map(table=>env.DB.prepare(`DELETE FROM ${table} WHERE expires_at<?`).bind(now)));
}
export default {
 async fetch(request,env,ctx){
  if(env.DB&&ctx&&new URL(request.url).pathname==='/api/auth/me')ctx.waitUntil(cleanup(env).catch(()=>console.error('Account cleanup failed; expired records remain inaccessible.')));
  try{return await handle(request,env);}catch(e){return json({error:e.status?e.message:'The account service is temporarily unavailable.'},e.status||503);}
 }
};
