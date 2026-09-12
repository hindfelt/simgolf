// Data-only checkpoint for the recovered runtime and its pending transaction.
// Map functions/resolvers are reconstructed by the owner, never serialized.
const FORMAT='fairway-baron.original-runtime',MAX_NODES=50000,MAX_BYTES=4000000,MAX_TEXT=12000000;
const types={Uint8Array,Int8Array,Uint16Array,Int16Array,Uint32Array,Int32Array,Float32Array,Float64Array};
const fail=()=>{throw Error('Invalid or unsupported original runtime checkpoint.');};
export function serializeOriginalRuntime(value){
 const nodes=[],seen=new Map();let bytes=0;
 function encode(v,depth=0){
  if(depth>128)fail();
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number'){if(!Number.isFinite(v))fail();return Object.is(v,-0)?{negativeZero:true}:v;}
  if(typeof v!=='object')fail();
  if(seen.has(v))return {ref:seen.get(v)};
  const id=nodes.length;if(id>=MAX_NODES)fail();seen.set(v,id);nodes.push(null);
  if(v instanceof ArrayBuffer){bytes+=v.byteLength;if(bytes>MAX_BYTES)fail();nodes[id]=['buffer',Array.from(new Uint8Array(v))];}
  else if(ArrayBuffer.isView(v)){
   const name=v.constructor.name;if(!Object.hasOwn(types,name))fail();
   nodes[id]=['view',name,encode(v.buffer,depth+1),v.byteOffset,v.length];
  }else if(Array.isArray(v))nodes[id]=['array',Array.from(v,x=>encode(x,depth+1))];
  else{
   if(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)fail();
   nodes[id]=['object',Object.entries(v).map(([k,x])=>[k,encode(x,depth+1)])];
  }
  return {ref:id};
 }
 const root=encode(value),text=JSON.stringify({format:FORMAT,version:1,root,nodes});if(text.length>MAX_TEXT)fail();return text;
}
export function restoreOriginalRuntime(text){
 if(typeof text!=='string'||text.length>MAX_TEXT)fail();
 const packed=JSON.parse(text),{nodes}=packed;
 if(packed.format!==FORMAT||packed.version!==1||!Array.isArray(nodes)||nodes.length>MAX_NODES)fail();
 const result=new Array(nodes.length);let bytes=0;
 function decode(v){
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number'){if(!Number.isFinite(v))fail();return v;}
  if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&v.negativeZero===true)return -0;
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==1||!Number.isInteger(v.ref)||v.ref<0||v.ref>=nodes.length)fail();
  return result[v.ref];
 }
 // Allocate backing storage and containers before resolving graph links.
 nodes.forEach((n,i)=>{
  if(!Array.isArray(n))fail();
  if(n[0]==='buffer'){
   if(n.length!==2||!Array.isArray(n[1])||n[1].some(b=>!Number.isInteger(b)||b<0||b>255))fail();
   bytes+=n[1].length;if(bytes>MAX_BYTES)fail();result[i]=Uint8Array.from(n[1]).buffer;
  }else if(n[0]==='array'){if(n.length!==2||!Array.isArray(n[1]))fail();result[i]=[];}
  else if(n[0]==='object'){if(n.length!==2||!Array.isArray(n[1]))fail();result[i]={};}
  else if(n[0]!=='view')fail();
 });
 nodes.forEach((n,i)=>{
  if(n[0]!=='view')return;
  const [,name,ref,offset,length]=n,T=types[name];
  if(n.length!==5||!Object.hasOwn(types,name)||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(length)||length<0)fail();
  const buffer=decode(ref);
  if(!(buffer instanceof ArrayBuffer)||offset%T.BYTES_PER_ELEMENT||offset+length*T.BYTES_PER_ELEMENT>buffer.byteLength)fail();
  result[i]=new T(buffer,offset,length);
 });
 nodes.forEach((n,i)=>{
  if(n[0]==='array'){for(const v of n[1])result[i].push(decode(v));}
  if(n[0]==='object'){
   const keys=new Set();
   for(const entry of n[1]){
    if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||keys.has(entry[0]))fail();keys.add(entry[0]);
    Object.defineProperty(result[i],entry[0],{value:decode(entry[1]),enumerable:true,writable:true,configurable:true});
   }
  }
 });
 return decode(packed.root);
}
