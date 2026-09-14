import {disposableDomains} from './disposable-domains.js';
import {fail} from './security.js';
const additional=new Set(['temp-mail.org','temp-mail.io','tempmail.com','tempmail.email','guerrillamail.com','guerillamail.com','guerrillamailblock.com','sharklasers.com','grr.la','10minutemail.com','mailinator.com','yopmail.com']);
export function emailDomain(email){
 if(typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+$/.test(email))throw fail(400,'Enter a valid email address.');
 const raw=email.split('@')[1].toLowerCase().replace(/\.$/,'');
 if(/[/:?#%\\]/.test(raw))throw fail(400,'Enter a valid email address.');
 let domain;try{domain=new URL('https://'+raw).hostname;}catch{throw fail(400,'Enter a valid email address.');}
 if(!domain.includes('.')||domain.split('.').some(label=>!label||label.startsWith('-')||label.endsWith('-')))throw fail(400,'Enter a valid email address.');
 return domain;
}
export function requirePermanentEmail(email){
 let domain=emailDomain(email);
 while(domain.includes('.')){if(disposableDomains.has(domain)||additional.has(domain))throw fail(403,'Temporary email services are not allowed. Use a permanent email address.');domain=domain.slice(domain.indexOf('.')+1);}
 return email;
}
