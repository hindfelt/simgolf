import {createMenuMusic} from './menu-music.js';
createMenuMusic(document.body);
import {safeDestination} from './auth-destination.js';
import './login.css';
import './brand-login.css';
const status=document.querySelector('#status'),emailForm=document.querySelector('#email-form'),codeForm=document.querySelector('#code-form');
const destination=safeDestination(new URLSearchParams(location.search).get('returnTo'));
let codeId;
const message=text=>status.textContent=text;
async function post(path,body){const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Sign-in could not be completed.');return data;}
if(import.meta.env.DEV && import.meta.env.VITE_AUTH_REQUIRED!=='true'){
 document.querySelector('h2').textContent='Local game preview';
 const notes=document.querySelectorAll('.login-card > .quiet');
 notes[0].textContent='Play and review this development version on this computer.';
 notes[1].textContent='Local saves stay in this browser. Online accounts, cloud saves and multiplayer are available on the hosted site.';
 const local=document.createElement('a');local.className='provider';local.href=destination==='/'?'/?start=1':destination;local.textContent='Open local preview';
 const online=document.createElement('a');online.className='provider';online.href='https://simgolfer.0x4d.in/';online.textContent='Sign in to the online game';
 document.querySelector('#providers').append(local,online);message('');
}else try{
 const response=await fetch('/api/auth/providers',{cache:'no-store'});if(!response.ok)throw Error('Sign-in is being configured. Please try again later.');
 const {providers}=await response.json();
 for(const provider of providers){
  if(provider.id==='email'){emailForm.hidden=false;continue;}
  if(!['google','apple','github','microsoft'].includes(provider.id))continue;
  const link=document.createElement('a');link.className='provider';link.href=`/api/auth/${provider.id}/start?returnTo=${encodeURIComponent(destination)}`;link.textContent=`Continue with ${provider.name}`;document.querySelector('#providers').append(link);
 }
 message(!providers.length?'Sign-in is being configured. Please try again later.':new URLSearchParams(location.search).get('error')==='email-policy'?'Temporary email services are not allowed. Use a permanent email address.':new URLSearchParams(location.search).has('error')?'Sign-in was cancelled, expired or unavailable for this account. Please try again.':'');
}catch(e){message(e.message);}
emailForm.onsubmit=async e=>{e.preventDefault();const button=emailForm.querySelector('button');button.disabled=true;try{const result=await post('/api/auth/email/start',{email:document.querySelector('#email').value,returnTo:destination});codeId=result.id;codeForm.hidden=false;document.querySelector('#code').focus();message('Check your inbox. Your code expires in 10 minutes.');}catch(e){message(e.message);}finally{button.disabled=false;}};
codeForm.onsubmit=async e=>{e.preventDefault();const button=codeForm.querySelector('button');button.disabled=true;try{const result=await post('/api/auth/email/verify',{id:codeId,code:document.querySelector('#code').value});location.assign(safeDestination(result.returnTo));}catch(e){message(e.message);}finally{button.disabled=false;}};
