"""Verify automatic club history/remark ordering with controlled remark effects."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EBX,UC_X86_REG_EBP,UC_X86_REG_EIP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
a=0x425239;o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+0x139])
u.mem_write(0x40be60,b'\xc3');u.mem_write(0x4672d0,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
fields={'marker':0x577f82,'reaction':0x577f8c,'actorClass':0x577f20,'club':0x577f24,'hole':0x577f29,'shotCounter':0x577f2a}
current=None;events=[]
def hook(u,a,size,data):
 sp=u.reg_read(UC_X86_REG_ESP)
 if a==0x40be60:
  pos=dict(x=read(sp+4),z=read(sp+8))
  if pos==current['actor']['target']:value=current['targetHeight']
  else:
   assert pos==current['origin'];value=current['originHeight']
  u.reg_write(UC_X86_REG_EAX,value&0xffffffff)
 if a==0x4672d0:
  events.append(dict(actorId=read(sp+4),kind=read(sp+8),value=read(sp+12)))
  if current['effect']=='marker':u.mem_write(fields['marker'],bytes([(u.mem_read(fields['marker'],1)[0]+1)&255]))
  if current['effect']=='reaction':u.mem_write(fields['reaction'],b'\x01')
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global current,events
 current=q;events=[];sp=0x102000
 for name,a in fields.items():u.mem_write(a,bytes([q['actor'][name]]))
 u.mem_write(0x577fa8,struct.pack('<H',q['actor']['usedClubs']))
 for a,v in [(0x577fd4,q['actor']['target']['x']),(0x577fd8,q['actor']['target']['z']),
  (sp+0x34,q['origin']['x']),(sp+0x40,q['origin']['z']),(sp+0x14,q['terrainCode'])]:write(a,v)
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp)
 u.reg_write(UC_X86_REG_EBP,q['previousMarker']);u.reg_write(UC_X86_REG_EBX,q['actorId'])
 u.emu_start(0x425239,0x425372,count=2000);assert u.reg_read(UC_X86_REG_EIP)==0x425372
 actor={name:u.mem_read(a,1)[0] for name,a in fields.items()}
 actor.update(usedClubs=struct.unpack('<H',u.mem_read(0x577fa8,2))[0],target=q['actor']['target'])
 marker=u.reg_read(UC_X86_REG_EBP);marker=marker if marker<2**31 else marker-2**32
 return dict(actor=actor,comparisonMarker=marker,events=events)
rng=random.Random(2002);rows=[]
for i in range(1500):
 marker=rng.randrange(256)
 q=dict(actorId=rng.randrange(152),previousMarker=marker if i%5 else (marker+1)%256,
  origin=dict(x=25,z=25),originHeight=rng.randrange(-8,9),targetHeight=rng.randrange(-8,9),terrainCode=1 if i%2 else 2,
  effect=['none','marker','reaction'][i%3],actor=dict(marker=marker,reaction=int(i%7==0),actorClass=int(i%4==0),
   club=rng.randrange(14),hole=rng.randrange(1,19),shotCounter=rng.randrange(10),usedClubs=0 if i%2 else rng.randrange(65536),target=dict(x=30,z=25)))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-auto-launch-history.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalAutoLaunchHistory}=await import(MODULE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){
 const a=originalAutoLaunchHistory(q,{heightAt:(x,z)=>x===q.actor.target.x&&z===q.actor.target.z?q.targetHeight:q.originHeight},(event,actor)=>{
  if(q.effect==='marker')actor.marker=(actor.marker+1)&255;
  if(q.effect==='reaction')actor.reaction=1;return actor;
 });if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));
}console.log('1500 original club history and ordered remark requests match executable.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:
 (root/'simgolf-reborn/scene/tests/fixtures/original-auto-launch-history.json').write_text(json.dumps(rows[:90],separators=(',',':'))+'\n')
