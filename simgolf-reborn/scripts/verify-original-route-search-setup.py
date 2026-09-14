"""Verify original cup/exact target selection, distance and heading."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
from unicorn.x86_const import UC_X86_REG_ECX,UC_X86_REG_EDI
for a,n in [(0x42252c,0x15c),(0x466ba0,0x10e),(0x4a57a0,0x27)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f)
current={};calls=[]
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def hook(u,a,n,d):
 if a==0x4219e0:
  calls.append(dict(shotCounter=u.mem_read(0x577f2a,1)[0],target=dict(x=read(0x577fd4),z=read(0x577fd8)),heading=read(0x577fe8)&0xffffffff,mode=read(0x5a870c)))
  sp=u.reg_read(UC_X86_REG_ESP);ret=read(sp)&0xffffffff
  u.reg_write(UC_X86_REG_EAX,current['followingRange']&0xffffffff);u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global current,calls
 current=q;calls=[];sp=0x102000
 for a,v in [(0x577fdc,q['x']),(0x577fe0,q['z']),(0x577f18,q['actorFlags']),(0x574518,q['cup']['x']),(0x57451c,q['cup']['z']),(0x5a870c,q['mode']),(sp+0x4c,q['range'])]:write(a,v)
 for a,v in [(0x577f21,q['skillMask']),(0x577f20,q['actorClass']),(0x577f2a,q['shotCounter']),(0x576dc2,q['shotClass'])]:u.mem_write(a,bytes([v&255]))
 u.mem_write(0x577f1e,struct.pack('<H',q['abilityFlags']))
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_EAX,0);u.reg_write(UC_X86_REG_ECX,q['mode']);u.reg_write(UC_X86_REG_EBX,1);u.reg_write(UC_X86_REG_EDI,0)
 u.emu_start(0x42252c,0x422688,count=3000)
 # Stop before publishing the restored counter; DL already contains it.
 from unicorn.x86_const import UC_X86_REG_EDX
 return dict(mode=read(0x5a870c),curveMask=read(sp+0x3c),target=dict(x=read(0x577fd4),z=read(0x577fd8)),heading=read(0x577fe8)&0xffffffff,distance=read(sp+0x5c),needsMoreThanTwoShots=bool(read(sp+0x88)),shotCounter=u.reg_read(UC_X86_REG_EDX)&255),calls
rng=random.Random(2002);rows=[]
for i in range(5000):
 q=dict(x=rng.randrange(51200),z=rng.randrange(51200),cup=dict(x=rng.randrange(50),z=rng.randrange(50)),mode=rng.randrange(4),actorFlags=rng.randrange(4),shotClass=rng.randrange(-2,5),actorClass=rng.choice([0,1,32]),skillMask=rng.randrange(8),abilityFlags=rng.randrange(128),shotCounter=rng.randrange(256),range=rng.randrange(1,331),followingRange=rng.randrange(1,331))
 e,calls=run(q);rows.append([q,e,calls])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-search-setup.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteSearchSetup}=await import(MODULE);
for(const [q,e,expectedCalls] of JSON.parse(readFileSync(0,'utf8'))){const calls=[];const a=originalRouteSearchSetup(q,c=>{calls.push(c);return q.followingRange;});if(!isDeepStrictEqual(a,e)||!isDeepStrictEqual(calls,expectedCalls))throw Error(JSON.stringify({q,a,e,calls,expectedCalls}));}
console.log('5000 route search setups and next-shot range queries match original.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-search-setup.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
