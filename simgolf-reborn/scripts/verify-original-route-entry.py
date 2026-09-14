"""Verify original route entry state and initial range query."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
from unicorn.x86_const import UC_X86_REG_ECX,UC_X86_REG_EDI
for a,n in [(0x42245e,0xce)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f)
current={};calls=[]
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def query(actor):return dict(actorId=actor,worldFlags=read(0x59d208)&0xffffffff,candidateSkillMask=read(0x4c1e0c),searchActive=read(0x59a188),searchFlag=read(0x5a872c),cornerTarget=read(0x5a8730))
def hook(u,a,n,d):
 if a==0x4219e0:
  sp=u.reg_read(UC_X86_REG_ESP);ret=read(sp)&0xffffffff
  calls.append(query(read(sp+4)))
  u.reg_write(UC_X86_REG_EAX,current['range']);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global current,calls
 current=q;calls=[];sp=0x102000;actor=q['actorId']*256
 u.mem_write(sp,bytes([0x42])*0x9000)
 for a,v in [(sp+0x7cc8,q['actorId']),(0x59d208,q['worldFlags']),(0x577fdc+actor,q['origin']['x']),(0x577fe0+actor,q['origin']['z']),(0x577fd4+actor,q['previousTarget']['x']),(0x577fd8+actor,q['previousTarget']['z'])]:write(a,v)
 u.mem_write(0x577f21+actor,bytes([q['skillMask']]))
 index=(q['origin']['x']>>10)*50+(q['origin']['z']>>10)
 u.mem_write(0x570d38+index,bytes([q['terrainCode']]))
 u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x42245e,0x42252c,count=10000)
 assert u.reg_read(UC_X86_REG_EIP)==0x42252c
 return dict(**query(q['actorId']),scores=[list(struct.unpack('<6i',u.mem_read(sp+0xbc+i*24,24))) for i in range(441)],winnerTargetX=read(sp+0x78),curve=read(sp+0x6c),range=read(sp+0x4c),previousTarget=dict(x=read(sp+0xa0),z=read(sp+0xa8)),originTile=dict(x=read(sp+0x90),z=read(sp+0x58)),terrainCode=u.reg_read(UC_X86_REG_EAX)),calls
rng=random.Random(2002);rows=[]
for i in range(500):
 q=dict(actorId=rng.randrange(256),worldFlags=rng.randrange(2**32),skillMask=rng.randrange(256),origin=dict(x=rng.randrange(51200),z=rng.randrange(51200)),previousTarget=dict(x=rng.randrange(50),z=rng.randrange(50)),terrainCode=rng.randrange(32),range=rng.randrange(331))
 e,calls=run(q);rows.append([q,e,calls])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-entry.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteEntry}=await import(MODULE);
for(const [q,e,expectedCalls] of JSON.parse(readFileSync(0,'utf8'))){const calls=[];const a=originalRouteEntry({...q,terrainAt:()=>({code:q.terrainCode})},c=>{calls.push(c);return q.range;});if(!isDeepStrictEqual(a,e)||!isDeepStrictEqual(calls,expectedCalls))throw Error(JSON.stringify({q,a,e,calls,expectedCalls}));}
console.log('500 route entries and initial range-query state match original.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-entry.json').write_text(json.dumps(rows[:8],separators=(',',':'))+'\n')
