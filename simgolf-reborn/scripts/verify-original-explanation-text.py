"""Recover straight-line explanation operations and verify native suffix assembly."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile,capstone
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import *
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x8000)
for a,n in [(0x4681dc,0xe0f),(0x469160,0xe9),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
for a in [0x466fb0,0x4074d0]:u.mem_write(a,b'\xc3')
ins=list(capstone.Cs(capstone.CS_ARCH_X86,capstone.CS_MODE_32).disasm(p.get_data(0x681dc,0xe0f),0x4681dc));copies={i.address for i in ins if i.mnemonic=='shr' and i.op_str=='ecx, 2'}
def text(a,s):u.mem_write(a,s.encode()+b'\0')
def read(a):return bytes(u.mem_read(a,1024)).split(b'\0')[0].decode()
events=[];ops=[]
def hook(u,a,size,data):
 if a in copies:
  source=u.reg_read(UC_X86_REG_ESI)
  if source==0x104010:ops.append(['pronoun'])
  elif source==0x576da0+48*q['value']:ops.append(['term'])
  elif source==0x55c648+37*q['value']:ops.append(['object'])
  elif 0x4c0000<=source<0x4f0000:ops.append(['text',read(source)])
  else:raise Exception(('unknown source',hex(a),hex(source)))
 if a in [0x466fb0,0x4074d0]:
  sp=u.reg_read(UC_X86_REG_ESP);n=2 if a==0x466fb0 else 3;args=list(struct.unpack('<'+'i'*n,u.mem_read(sp+4,n*4)));events.append(dict(address=a,args=args));ops.append(['name'] if n==2 else ['location']);text(0x518f78,read(0x518f78)+('Name'+str(args[0]) if n==2 else 'Place'+str(args[0])+','+str(args[1])));u.mem_write(0x589be8,struct.pack('<I',91))
u.hook_add(UC_HOOK_CODE,hook);rows=[];table={}
for kind in range(67):
 for i in range(32):
  value=[-2,-1,0,1,2,3,49,50][i%8];q=dict(kind=kind,value=value,actorId=i%4,pronoun=['he','she','they',''][i//8],terms={str(value):dict(name='Term'+str(value))},objectNames={str(value):'Object'+str(value)},state=dict(sourceText=['Prefix','Prefix\0ignored',''][i%3],remarkStyle=5))
  text(0x518f78,q['state']['sourceText']);text(0x104010,q['pronoun']);text(0x576da0+48*value,q['terms'][str(value)]['name']);text(0x55c648+37*value,q['objectNames'][str(value)]);u.mem_write(0x589be8,struct.pack('<I',5));u.reg_write(UC_X86_REG_ESP,0x104000);u.reg_write(UC_X86_REG_EAX,(kind-1)&0xffffffff);u.reg_write(UC_X86_REG_EBP,value&0xffffffff);u.reg_write(UC_X86_REG_EBX,q['actorId']);events=[];ops=[]
  u.emu_start(0x4681dc,0x468feb,count=20000);assert u.reg_read(UC_X86_REG_EIP)==0x468feb
  if kind in table:assert table[kind]==ops
  else:table[kind]=ops
  rows.append([q,dict(state=dict(sourceText=read(0x518f78),remarkStyle=struct.unpack('<I',u.mem_read(0x589be8,4))[0]),events=events)])
(root/'simgolf-reborn/scene/src/simulation/original-explanation-text-data.js').write_text('// Extracted from original straight-line explanation branches; see native verifier.\nexport const ORIGINAL_EXPLANATION_OPERATIONS='+json.dumps(table,indent=1)+';\n')
module=(root/'simgolf-reborn/scene/src/simulation/original-explanation-text.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalExplanationText} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const got=originalExplanationText(q,(e,s)=>({...s,remarkStyle:91,sourceText:s.sourceText.split('\\0',1)[0]+(e.address===0x466fb0?'Name'+e.args[0]:'Place'+e.args[0]+','+e.args[1])}));if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native explanation-text cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-explanation-text.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
