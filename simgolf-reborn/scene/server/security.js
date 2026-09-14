const encoder=new TextEncoder();
export const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
export async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),v=>v.toString(16).padStart(2,'0')).join('');}
export async function challenge(value){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export function cookie(request,name){return request.headers.get('cookie')?.split(';').map(p=>p.trim()).find(p=>p.startsWith(name+'='))?.slice(name.length+1);}
export const names={session:'__Host-simgolfer_session',oauth:'__Host-simgolfer_oauth',email:'__Host-simgolfer_email'};
export function setCookie(name,value,seconds=2592000,sameSite='Lax'){return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=${sameSite}; Max-Age=${seconds}`;}
export function json(value,status=200,extra={}){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});}
export const fail=(status,message)=>Object.assign(new Error(message),{status});
export function sameOrigin(request,env){if(request.headers.get('origin')!==env.APP_ORIGIN)throw fail(403,'Request origin rejected.');}
export async function readText(request,max=4096){
 const reader=request.body?.getReader();if(!reader)throw fail(400,'Missing request body.');let size=0,chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw fail(413,'Request too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);
}
export async function readJson(request,max=4096){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail(415,'Expected JSON.');
 const text=await readText(request,max);let value;try{value=JSON.parse(text);}catch{throw fail(400,'Invalid JSON.');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw fail(400,'Expected a JSON object.');return value;
}
export async function rateLimit(db,key,limit,seconds){
 const now=Date.now(),row=await db.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(key,now+seconds*1000,now,now).first();
 if(row.count>limit)throw fail(429,'Too many attempts. Please try again later.');
}
