const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function safeDestination(value){
 if(typeof value!=='string'||value.length>1000||!value.startsWith('/')||value.startsWith('//')||/[\s\\]/.test(value))return '/';
 let url;try{url=new URL(value,'https://game.invalid');}catch{return '/';}
 if(url.origin!=='https://game.invalid'||!['/','/index.html'].includes(url.pathname))return '/';
 const modes=['shared','tournament','event','earnings'].filter(key=>url.searchParams.has(key));
 if(modes.length>1)return '/';
 const query=new URLSearchParams();
 if(modes.length){const key=modes[0],id=url.searchParams.get(key);if(!uuid.test(id))return '/';query.set(key,id.toLowerCase());if(key==='tournament'){const round=url.searchParams.get('round')||'1';if(!/^[1-4]$/.test(round))return '/';query.set('round',round);}}
 else if(url.searchParams.get('testing')==='1')query.set('testing','1');
 return query.size?'/?'+query:'/';
}
export function loginLocation(destination,error){
 const query=new URLSearchParams(),next=safeDestination(destination);
 if(error)query.set('error',error);
 if(next!=='/')query.set('returnTo',next);
 return '/login.html'+(query.size?'?'+query:'');
}
