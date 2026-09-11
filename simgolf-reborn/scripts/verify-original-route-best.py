"""Verify original option accumulation, search flag and strict winner updates."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x10000)
for a,n in [(0x4230a7,0x97)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_map(0x820000,0x1000)
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def run(q):
 sp=0x102000;w=q['winner']
 for off,v in [(0x34,0),(0x1c,q['sampleScore']),(0xbc,q['score']),(0x38,q['samples']),(0x28,q['badSamples']),(0x60,w['score']),(0x18,q['target']['z']),(0x2c,q['target']['x']),(0x10,q['cornerTarget']),(0x14,q['curve']),(0x536c,q['sampleFlags']),(0x78,w['target']['x']),(0xa4,w['target']['z']),(0x6c,w['curve']),(0xac,w['landingFlag'])]:write(sp+off,v)
 for a,v in [(0x820344,q['level']),(0x5a872c,q['searchFlag']),(0x5691dc,q['landing']['x']),(0x5691e0,q['landing']['z']),(0x5a7270,w['landing']['x']),(0x5a7278,w['landing']['z']),(0x5a8730,w['cornerTarget'])]:write(a,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.emu_start(0x4230a7,0x42313e,count=1000)
 return dict(score=read(sp+0xbc),searchFlag=read(0x5a872c),winner=dict(score=read(sp+0x60),target=dict(x=read(sp+0x78),z=read(sp+0xa4)),curve=read(sp+0x6c),cornerTarget=read(0x5a8730),landing=dict(x=read(0x5a7270),z=read(0x5a7278)),landingFlag=read(sp+0xac)))
rng=random.Random(2002);rows=[]
for i in range(5000):
 point=lambda:dict(x=rng.randrange(50),z=rng.randrange(50))
 q=dict(score=rng.randrange(-1000,100000),sampleScore=rng.randrange(-1000,10000),level=rng.randrange(4),samples=rng.choice([2,4,8]),badSamples=rng.randrange(9),searchFlag=rng.randrange(2),target=point(),curve=rng.randrange(-1,2),cornerTarget=rng.randrange(2),landing=point(),sampleFlags=rng.randrange(2**32),winner=dict(score=rng.randrange(-1000,100000),target=point(),curve=rng.randrange(-1,2),cornerTarget=rng.randrange(2),landing=point(),landingFlag=rng.randrange(2)))
 if i%7==0:q['winner']['score']=q['score']+q['sampleScore']
 if i%11==0:q.update(score=2147483600,sampleScore=1000)
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-route-best.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalRouteBest}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=originalRouteBest(q);if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));}
console.log('5000 original option accumulation and winner updates match.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-route-best.json').write_text(json.dumps(rows[:60],separators=(',',':'))+'\n')
