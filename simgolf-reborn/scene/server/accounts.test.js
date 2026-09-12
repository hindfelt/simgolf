import {beforeEach,afterEach,expect,test,vi} from 'vitest';
import {env} from 'cloudflare:workers';
import worker,{cleanup} from './worker.js';
import {hash,names} from './security.js';
const origin='https://simgolfer.example';
const request=(path,options={},bindings=env)=>worker.fetch(new Request(origin+path,options),bindings);
const post=(body,headers={})=>({method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
const cookieOf=response=>response.headers.get('set-cookie').split(';')[0];
let mailbox=[],upstream=[];
const mailEnv=()=>({...env,EMAIL_FROM:'login@example.test',EMAIL:{send:async message=>{mailbox.push(message);return {messageId:'test'};}}});
async function emailLogin(email='golfer@proton.me'){
 const start=await request('/api/auth/email/start',post({email}),mailEnv());expect(start.status).toBe(200);
 const {id}=await start.json(),code=mailbox.at(-1).text.match(/\b\d{8}\b/)[0];
 const response=await request('/api/auth/email/verify',post({id,code},{cookie:cookieOf(start)}),mailEnv());expect(response.status).toBe(200);
 const cookie=cookieOf(response),me=await request('/api/auth/me',{headers:{cookie}});return {cookie,...await me.json()};
}
beforeEach(async()=>{
 for(const table of ['admin_actions','saves','sessions','identities','players','transactions','email_codes','rate_limits'])await env.DB.prepare(`DELETE FROM ${table}`).run();
 mailbox=[];upstream=[];vi.stubGlobal('fetch',async(url,options={})=>{const next=upstream.shift();if(!next||String(url)!==next.url)throw Error('Unexpected upstream fetch: '+url);return new Response(JSON.stringify(next.data),{headers:{'content-type':'application/json'}});});
});
afterEach(()=>vi.unstubAllGlobals());
test('daily cleanup removes expired records once without removing active sessions',async()=>{
 const active=await emailLogin();
 await env.DB.prepare("INSERT INTO rate_limits(key,count,expires_at) VALUES ('expired',1,0)").run();
 await cleanup(env);
 expect(await env.DB.prepare("SELECT key FROM rate_limits WHERE key='expired'").first()).toBeNull();
 expect((await request('/api/auth/me',{headers:{cookie:active.cookie}})).status).toBe(200);
 await env.DB.prepare("INSERT INTO rate_limits(key,count,expires_at) VALUES ('expired',1,0)").run();
 await cleanup(env);
 expect(await env.DB.prepare("SELECT key FROM rate_limits WHERE key='expired'").first()).not.toBeNull();
 await env.DB.prepare("UPDATE rate_limits SET expires_at=0 WHERE key='maintenance'").run();
 await cleanup(env);
 expect(await env.DB.prepare("SELECT key FROM rate_limits WHERE key='expired'").first()).toBeNull();
});
test('anonymous visitors cannot play or access cloud saves, including testing URLs',async()=>{
 for(const path of ['/','/?testing=1','/index.html']){const r=await request(path);expect(r.status).toBe(303);expect(r.headers.get('location')).toBe(path==='/?testing=1'?'/login.html?returnTo=%2F%3Ftesting%3D1':'/login.html');}
 for(const destination of ['/?shared=11111111-1111-4111-8111-111111111111','/?event=11111111-1111-4111-8111-111111111111','/?tournament=11111111-1111-4111-8111-111111111111&round=4']){const response=await request(destination);expect(response.status).toBe(303);expect(new URL(response.headers.get('location'),origin).searchParams.get('returnTo')).toBe(destination);}
 expect((await request('/api/saves/course')).status).toBe(401);
 expect((await request('/api/auth/me',{headers:{cookie:`${names.session}=forged`}})).status).toBe(401);
 // Workers Assets canonicalizes login.html to /login. Both must stay public.
 const assets={...env,ASSETS:{fetch:async()=>new Response('Sign in')}};
 for(const path of ['/login.html','/login'])expect(await (await request(path,{},assets)).text()).toBe('Sign in');
 const disabled=await request('/api/auth/providers',{}, {DB:env.DB});expect(await disabled.json()).toEqual({providers:[]});
});
test('shared-course HTTP routes derive identity from the session and delete owned data with the account',async()=>{
 const a=await emailLogin('owner@proton.me'),b=await emailLogin('editor@proton.me');
 const headers={cookie:a.cookie,'x-csrf-token':a.csrf};
 expect((await request('/api/courses',post({name:'Mine',cash:999999},headers))).status).toBe(400);
 expect((await request('/api/courses',post({name:'Mine'},{cookie:a.cookie}))).status).toBe(403);
 const created=await request('/api/courses',post({name:'Mine'},headers));expect(created.status).toBe(201);const course=await created.json();expect(course.ownerId).toBe(a.user.id);
 expect((await request('/api/courses/'+course.id,{headers:{cookie:b.cookie}})).status).toBe(404);
 expect((await request('/api/courses/'+course.id+'/members',{...post({playerId:b.user.id,role:'editor'},headers),method:'PUT'})).status).toBe(200);
 expect((await (await request('/api/courses/'+course.id,{headers:{cookie:b.cookie}})).json()).role).toBe('editor');
 expect((await request('/api/account',{...post({confirm:'DELETE'},headers),method:'DELETE'})).status).toBe(200);
 expect((await request('/api/courses/'+course.id,{headers:{cookie:b.cookie}})).status).toBe(404);
 expect(await env.DB.prepare('SELECT * FROM course_members WHERE course_id=?').bind(course.id).first()).toBeNull();
});
test('email registration supports Proton, keeps server-only cookies, and reuses the same identity',async()=>{
 const a=await emailLogin();expect(a.user.email).toBe('golfer@proton.me');expect(a.user.id).toBeTruthy();
 const b=await emailLogin();expect(b.user.id).toBe(a.user.id);
 const count=await env.DB.prepare('SELECT count(*) as n FROM players').first();expect(count.n).toBe(1);
 expect(a.cookie).toContain('__Host-');
});
test('email codes are browser-bound, single-use, expire, and stop after five guesses',async()=>{
 const start=await request('/api/auth/email/start',post({email:'a@proton.me'}),mailEnv()),{id}=await start.json(),code=mailbox[0].text.match(/\b\d{8}\b/)[0];
 expect((await request('/api/auth/email/verify',post({id,code}),mailEnv())).status).toBe(401);
 const valid=post({id,code},{cookie:cookieOf(start)});expect((await request('/api/auth/email/verify',valid,mailEnv())).status).toBe(200);
 expect((await request('/api/auth/email/verify',valid,mailEnv())).status).toBe(401);
 const next=await request('/api/auth/email/start',post({email:'b@proton.me'}),mailEnv()),other=await next.json(),actual=mailbox[1].text.match(/\b\d{8}\b/)[0];
 for(let i=0;i<5;i++)expect((await request('/api/auth/email/verify',post({id:other.id,code:actual==='00000000'?'11111111':'00000000'},{cookie:cookieOf(next)}),mailEnv())).status).toBe(401);
 expect((await request('/api/auth/email/verify',post({id:other.id,code:actual},{cookie:cookieOf(next)}),mailEnv())).status).toBe(401);
 const expired=await request('/api/auth/email/start',post({email:'c@proton.me'}),mailEnv()),expiredData=await expired.json();await env.DB.prepare('UPDATE email_codes SET expires_at=0 WHERE id=?').bind(expiredData.id).run();
 expect((await request('/api/auth/email/verify',post({id:expiredData.id,code:mailbox[2].text.match(/\b\d{8}\b/)[0]},{cookie:cookieOf(expired)}),mailEnv())).status).toBe(401);
});
test('email sending is rate limited and rejects foreign origins',async()=>{
 expect((await request('/api/auth/email/start',post({email:'a@proton.me'},{origin:'https://evil.example'}),mailEnv())).status).toBe(403);
 for(let i=0;i<3;i++)expect((await request('/api/auth/email/start',post({email:'a@proton.me'}),mailEnv())).status).toBe(200);
 expect((await request('/api/auth/email/start',post({email:'a@proton.me'}),mailEnv())).status).toBe(429);expect(mailbox).toHaveLength(3);
});
test('cloud saves belong to the session owner and stale writes cannot overwrite another device',async()=>{
 const a=await emailLogin('a@proton.me'),b=await emailLogin('b@proton.me');
 const put=(auth,n,data)=>({method:'PUT',headers:{cookie:auth.cookie,origin,'x-csrf-token':auth.csrf,'content-type':'application/json','if-match':String(n)},body:JSON.stringify(data)});
 expect((await request('/api/saves/course',put(a,0,{course:'A',player_id:b.user.id}))).status).toBe(200);
 const br=await request('/api/saves/course',{headers:{cookie:b.cookie}});expect(await br.json()).toEqual({data:null,revision:0});
 const ar=await request('/api/saves/course',{headers:{cookie:a.cookie}});expect((await ar.json()).data.course).toBe('A');
 expect((await request('/api/saves/course',put(a,1,{course:'A2'}))).status).toBe(200);
 expect((await request('/api/saves/course',put(a,1,{course:'stale'}))).status).toBe(409);
 expect((await request('/api/saves/course',put(a,0,{course:'stale'}))).status).toBe(409);
 const denied=put(a,2,{});delete denied.headers['x-csrf-token'];expect((await request('/api/saves/course',denied)).status).toBe(403);
 const foreign=put(a,2,{});foreign.headers.origin='https://evil.example';expect((await request('/api/saves/course',foreign)).status).toBe(403);
});
test('logout and expiry invalidate sessions; deleting an account removes only its data',async()=>{
 const a=await emailLogin('a@proton.me'),b=await emailLogin('b@proton.me');
 expect((await request('/api/auth/logout',post({}, {cookie:a.cookie,'x-csrf-token':a.csrf}))).status).toBe(200);
 expect((await request('/api/auth/me',{headers:{cookie:a.cookie}})).status).toBe(401);
 const again=await emailLogin('a@proton.me');expect((await request('/api/account',{...post({confirm:'DELETE'},{cookie:again.cookie,'x-csrf-token':again.csrf}),method:'DELETE'})).status).toBe(200);
 expect((await request('/api/auth/me',{headers:{cookie:again.cookie}})).status).toBe(401);expect((await request('/api/auth/me',{headers:{cookie:b.cookie}})).status).toBe(200);
 await env.DB.prepare('UPDATE sessions SET expires_at=0').run();expect((await request('/api/auth/me',{headers:{cookie:b.cookie}})).status).toBe(401);
});
function githubMocks(id=42,email='golfer@proton.me'){
 upstream.push({url:'https://github.com/login/oauth/access_token',data:{access_token:'upstream-token'}},
 {url:'https://api.github.com/user',data:{id,login:'golfer',name:'Golf Player'}},
 {url:'https://api.github.com/user/emails',data:[{email,primary:true,verified:true}]});
}
test('GitHub uses PKCE and browser state, consumes callbacks once and never merges by email',async()=>{
 const email=await emailLogin(),start=await request('/api/auth/github/start'),url=new URL(start.headers.get('location'));
 expect(url.searchParams.get('code_challenge_method')).toBe('S256');const state=url.searchParams.get('state');
 expect((await request(`/api/auth/github/callback?state=${state}&code=test`)).headers.get('location')).toContain('error');
 githubMocks();const callback=await request(`/api/auth/github/callback?state=${state}&code=test`,{headers:{cookie:cookieOf(start)}});expect(callback.headers.get('location')).toBe('/');
 const me=await request('/api/auth/me',{headers:{cookie:cookieOf(callback)}});expect((await me.json()).user.id).not.toBe(email.user.id);
 const replay=await request(`/api/auth/github/callback?state=${state}&code=test`,{headers:{cookie:cookieOf(start)}});expect(replay.headers.get('location')).toContain('error');
});
test('connecting a provider requires a session and CSRF, then retains the player identity',async()=>{
 const a=await emailLogin();expect((await request('/api/auth/github/link',post({}))).status).toBe(403);
 const destination='/?shared=11111111-1111-4111-8111-111111111111';
 const start=await request('/api/auth/github/link?returnTo='+encodeURIComponent(destination),post({},{cookie:a.cookie,'x-csrf-token':a.csrf})),url=new URL((await start.json()).url);
 githubMocks();const callback=await request(`/api/auth/github/callback?state=${url.searchParams.get('state')}&code=test`,{headers:{cookie:cookieOf(start)}});
 expect(callback.headers.get('location')).toBe(destination);
 const me=await request('/api/auth/me',{headers:{cookie:cookieOf(callback)}});expect((await me.json()).user.id).toBe(a.user.id);
});
test('oversized save bodies are rejected before persistence',async()=>{
 const a=await emailLogin();const result=await request('/api/saves/course',{method:'PUT',headers:{cookie:a.cookie,origin,'x-csrf-token':a.csrf,'content-type':'application/json','if-match':'0'},body:JSON.stringify({data:'x'.repeat(750001)})});expect(result.status).toBe(413);
});

test('temporary email domains and subdomains are blocked for email and federated registration',async()=>{
 for(const email of ['a@guerrillamail.com','a@Temp-Mail.org','a@sub.SHARKLASERS.COM','a@mailinator.com.']){
  const result=await request('/api/auth/email/start',post({email}),mailEnv());expect(result.status).toBe(403);
 }
 expect(mailbox).toHaveLength(0);
 const start=await request('/api/auth/github/start'),state=new URL(start.headers.get('location')).searchParams.get('state');githubMocks(99,'cheat@guerrillamail.com');
 const result=await request(`/api/auth/github/callback?state=${state}&code=test`,{headers:{cookie:cookieOf(start)}});expect(result.headers.get('location')).toContain('email-policy');
 expect((await env.DB.prepare('SELECT count(*) as n FROM players').first()).n).toBe(0);
});
test('ordinary players cannot administer accounts; suspension revokes access and records the administrator',async()=>{
 const admin=await emailLogin('admin@proton.me'),player=await emailLogin('player@proton.me');
 expect((await request('/api/admin/players',{headers:{cookie:player.cookie}})).status).toBe(403);
 expect((await request(`/api/admin/players/${admin.user.id}/suspend`,post({role:'admin'},{cookie:player.cookie,'x-csrf-token':player.csrf}))).status).toBe(403);
 await env.DB.prepare("UPDATE players SET role='admin' WHERE id=?").bind(admin.user.id).run();
 const list=await request('/api/admin/players',{headers:{cookie:admin.cookie}});expect((await list.json()).players).toHaveLength(2);
 const mutate=operation=>request(`/api/admin/players/${player.user.id}/${operation}`,post({},{cookie:admin.cookie,'x-csrf-token':admin.csrf}));
 expect((await mutate('suspend')).status).toBe(200);expect((await request('/api/auth/me',{headers:{cookie:player.cookie}})).status).toBe(401);
 expect((await env.DB.prepare('SELECT * FROM admin_actions').first()).actor_id).toBe(admin.user.id);
 expect((await mutate('restore')).status).toBe(200);expect((await request('/api/auth/me',{headers:{cookie:player.cookie}})).status).toBe(401);
 const fresh=await emailLogin('player@proton.me');expect(fresh.user.id).toBe(player.user.id);expect((await mutate('revoke-sessions')).status).toBe(200);
 expect((await request('/api/auth/me',{headers:{cookie:fresh.cookie}})).status).toBe(401);
});
test('provider linking cannot merge another player or finish after its authorizing session is revoked',async()=>{
 const a=await emailLogin('a@proton.me'),b=await emailLogin('b@proton.me');
 const begin=auth=>request('/api/auth/github/link',post({},{cookie:auth.cookie,'x-csrf-token':auth.csrf}));
 let start=await begin(a),state=new URL((await start.json()).url).searchParams.get('state');githubMocks();
 expect((await request(`/api/auth/github/callback?state=${state}&code=test`,{headers:{cookie:cookieOf(start)}})).headers.get('location')).toBe('/');
 start=await begin(b);state=new URL((await start.json()).url).searchParams.get('state');githubMocks();
 expect((await request(`/api/auth/github/callback?state=${state}&code=test`,{headers:{cookie:cookieOf(start)}})).headers.get('location')).toContain('error');
 start=await begin(b);state=new URL((await start.json()).url).searchParams.get('state');await request('/api/auth/logout',post({},{cookie:b.cookie,'x-csrf-token':b.csrf}));
 expect((await request(`/api/auth/github/callback?state=${state}&code=test`,{headers:{cookie:cookieOf(start)}})).headers.get('location')).toContain('error');
 expect((await env.DB.prepare("SELECT player_id FROM identities WHERE provider='github'").first()).player_id).toBe(a.user.id);
});

test('Google, Microsoft and Apple tokens require signature, audience, issuer and the browser nonce',async()=>{
 const {generateKeyPair,exportJWK,exportPKCS8,SignJWT}=await import('jose');
 const signing=await generateKeyPair('RS256',{extractable:true}),publicKey={...await exportJWK(signing.publicKey),kid:'test-key',alg:'RS256',use:'sig'};
 const apple=await generateKeyPair('ES256',{extractable:true});
 const tenant='9188040d-6c67-4c5b-b112-36a304b66dad';
 const bindings={...env,MICROSOFT_CLIENT_ID:'microsoft-test',MICROSOFT_CLIENT_SECRET:'ms-test',APPLE_CLIENT_ID:'apple-test',APPLE_TEAM_ID:'TEAM',APPLE_KEY_ID:'KEY',APPLE_PRIVATE_KEY:await exportPKCS8(apple.privateKey)};
 for(const id of ['google','microsoft','apple']){
  const issuer={google:'https://accounts.google.com',microsoft:`https://login.microsoftonline.com/${tenant}/v2.0`,apple:'https://appleid.apple.com'}[id];
  const tokenUrl={google:'https://oauth2.googleapis.com/token',microsoft:'https://login.microsoftonline.com/common/oauth2/v2.0/token',apple:'https://appleid.apple.com/auth/token'}[id];
  const keysUrl={google:'https://www.googleapis.com/oauth2/v3/certs',microsoft:'https://login.microsoftonline.com/common/discovery/v2.0/keys',apple:'https://appleid.apple.com/auth/keys'}[id];
  for(const mode of ['valid','nonce','audience','issuer','expired']){
   const destination='/?event=11111111-1111-4111-8111-111111111111';
   const start=await request(`/api/auth/${id}/start`+(mode==='valid'?'?returnTo='+encodeURIComponent(destination):''),{},bindings),url=new URL(start.headers.get('location')),state=url.searchParams.get('state'),nonce=url.searchParams.get('nonce');
   if(id==='apple')expect(start.headers.get('set-cookie')).toContain('SameSite=None');
   const signed=await new SignJWT({email:`${id}@proton.me`,email_verified:true,nonce:mode==='nonce'?'wrong':nonce,...(id==='microsoft'?{tid:tenant}:{})}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(mode==='issuer'?'https://evil.example':issuer).setAudience(mode==='audience'?'wrong':bindings[id.toUpperCase()+'_CLIENT_ID']).setSubject('provider-player').setIssuedAt().setExpirationTime(mode==='expired'?'0s':'5m').sign(signing.privateKey);
   upstream.push({url:tokenUrl,data:{id_token:signed}});if(mode==='valid')upstream.push({url:keysUrl,data:{keys:[publicKey]}});
   const options={headers:{cookie:cookieOf(start)}};let path=`/api/auth/${id}/callback?state=${state}&code=test`;
   if(id==='apple'){path=`/api/auth/${id}/callback`;options.method='POST';options.headers['content-type']='application/x-www-form-urlencoded';options.body=new URLSearchParams({state,code:'test'}).toString();}
   const result=await request(path,options,bindings);expect(result.headers.get('location')).toBe(mode==='valid'?destination:'/login.html?error=signin');
  }
 }
});
test('an old browser tab cannot load data after the signed-in player changes',async()=>{
 const a=await emailLogin('a@proton.me'),b=await emailLogin('b@proton.me');
 expect((await request('/api/saves/course',{headers:{cookie:b.cookie,'x-player-id':a.user.id}})).status).toBe(409);
});

test('email return destination is browser-bound and cannot be replaced at verification',async()=>{
 const destination='/?tournament=11111111-1111-4111-8111-111111111111&round=2';
 const start=await request('/api/auth/email/start',post({email:'invited@proton.me',returnTo:destination}),mailEnv()),{id}=await start.json(),code=mailbox[0].text.match(/\b\d{8}\b/)[0];
 const result=await request('/api/auth/email/verify',post({id,code,returnTo:'https://evil.example'},{cookie:cookieOf(start)}),mailEnv());expect((await result.json()).returnTo).toBe(destination);
});
test('GitHub returns to a validated invitation and cancelled sign-in retains it for retry',async()=>{
 const destination='/?event=11111111-1111-4111-8111-111111111111';
 const begin=target=>request('/api/auth/github/start?returnTo='+encodeURIComponent(target));
 let start=await begin(destination),state=new URL(start.headers.get('location')).searchParams.get('state');
 const cancelled=await request(`/api/auth/github/callback?state=${state}&error=access_denied`,{headers:{cookie:cookieOf(start)}});
 expect(new URL(cancelled.headers.get('location'),origin).searchParams.get('returnTo')).toBe(destination);
 start=await begin(destination);state=new URL(start.headers.get('location')).searchParams.get('state');githubMocks();
 expect((await request(`/api/auth/github/callback?state=${state}&code=test&returnTo=https://evil.example`,{headers:{cookie:cookieOf(start)}})).headers.get('location')).toBe(destination);
 start=await begin('//evil.example');state=new URL(start.headers.get('location')).searchParams.get('state');githubMocks();
 expect((await request(`/api/auth/github/callback?state=${state}&code=test`,{headers:{cookie:cookieOf(start)}})).headers.get('location')).toBe('/');
});
