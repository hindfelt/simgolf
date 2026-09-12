"""Compare full non-putter scenery sampling with original RNG/projection."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
for a,n in [(0x400000,0x200000),(0x820000,0x1000),(0x839000,0x1000),(0x100000,0x4000)]:u.mem_map(a,n)
for a,n in [(0x4249b3,0x2c9),(0x45ba70,0x60),(0x4b9800,8),(0x4a57a0,0x27),(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16),(0x40bc50,0x33),(0x4c1870,64),(0x40dc70,0x77)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
for a in [0x40be60]:u.mem_write(a,b'\xc3')
def write(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
current=None;draws=0
def hook(u,a,size,data):
 global draws
 if a==0x45bab0:draws+=1
 if a==0x40be60:
  sp=u.reg_read(UC_X86_REG_ESP);x=read(sp+4);z=read(sp+8)
  value=current['heightBase']+((x+z)&3)
  u.reg_write(UC_X86_REG_EAX,value&0xffffffff)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global current,draws
 current=q;draws=0;sp=0x102000;s=q['state']
 for a,v in [(0x577f08,q['position']['x']),(0x577f0c,q['position']['z']),(0x577fe8,q['heading']),
  (0x820454,s['seed']),(0x820344,q['conditionLevel']),(0x574524+2*520,s['holeCounter']),
  (sp+0x34,q['origin']['x']),(sp+0x40,q['origin']['z']),(sp+0x10,q['distance']),
  (sp+0x38,s['scannedTile']),(sp+0x48,s['sceneryTile']),(sp+0x1c,s['namedReference']),(sp+0x44,s['pathHeading'])]:write(a,v)
 u.mem_write(0x577f29,b'\x02')
 terrain=bytes([3 if (x-z)%7==0 else [2,19,21,22][(x+z)%4] for x in range(50) for z in range(50)])
 u.mem_write(0x570d38,terrain)
 marks=[0x100 if (x+z)%6==0 else 0 for x in range(50) for z in range(50)]
 u.mem_write(0x53ba00,struct.pack('<2500H',*marks))
 for code in [0,2,3,19,21,22]:
  u.mem_write(0x576dc6+code*48,bytes([13 if code==3 else 0]))
  u.mem_write(0x576dc7+code*48,bytes([16 if code in [21,22] else 0]))
 for code,size in [(4,2),(5,3),(6,1),(7,2)]:
  u.mem_write(0x4c16b8+code*20,bytes([size]));write(0x5a7680+code*4,3 if code==6 else 9)
 records=[dict(type=-1 if i%5==0 else q['record']['type'] if i%3==0 else 6 if i%2 else 7,x=(i%16)*3,z=(i//16)*3,value=q['record']['value']) for i in range(256)]
 for index,record in [(-1,dict(q['missingRecord'],x=0,z=0)),*enumerate(records)]:
  u.mem_write(0x58a708+index*16,struct.pack('<hhh',record['type'],record['x'],record['z']));write(0x58a710+index*16,record['value'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_ESP,sp)
 u.emu_start(0x4249b3,0x424c7c,count=500000);assert u.reg_read(UC_X86_REG_EIP)==0x424c7c
 return dict(seed=read(0x820454)&0xffffffff,holeCounter=read(0x574524+2*520),scannedTile=read(sp+0x38),sceneryTile=read(sp+0x48),namedReference=read(sp+0x1c),pathHeading=read(sp+0x44),samples=read(sp+0x20),randomDraws=draws)
rng=random.Random(2002);rows=[]
for i in range(300):
 x=rng.choice([512,25500,50500]);z=rng.choice([512,25500,50500])
 q=dict(position=dict(x=x,z=z),origin=dict(x=x>>10,z=z>>10),heading=rng.randrange(2**32),distance=rng.randrange(201),conditionLevel=i%4,heightBase=[-4,0,3,8][i%4],record=dict(type=4 if i%2 else 5,value=[0,7,16,32][i%4]),missingRecord=dict(type=4,value=i%25),state=dict(seed=rng.randrange(2**32),holeCounter=i,scannedTile=17,sceneryTile=23,namedReference=0,pathHeading=7))
 rows.append([q,run(q)])
module=(root/'simgolf-reborn/scene/src/simulation/original-auto-scenery.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalAutoScenery}=await import(MODULE);const {originalPlannerWorldRecords}=await import(READER);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){
 const records=Array.from({length:256},(_,i)=>({type:i%5===0?-1:i%3===0?q.record.type:i%2?6:7,x:(i%16)*3,z:Math.floor(i/16)*3,value:q.record.value}));
 const facilityRecords=new Uint8Array(4096),v=new DataView(facilityRecords.buffer);records.forEach((r,i)=>{v.setInt16(i*16,r.type,true);v.setInt16(i*16+2,r.x,true);v.setInt16(i*16+4,r.z,true);v.setInt32(i*16+8,r.value,true);});const objectPrefixRecord=new Uint8Array(16),pv=new DataView(objectPrefixRecord.buffer);pv.setInt16(0,q.missingRecord.type,true);pv.setInt32(8,q.missingRecord.value,true);const packed=originalPlannerWorldRecords({facilityRecords,objectPrefixRecord,objectBaseSizes:Int8Array.from({length:8},(_,t)=>({4:2,5:3,6:1,7:2})[t]||0),objectExpansions:Int32Array.from({length:8},(_,t)=>t===6?3:9)});
 const a=originalAutoScenery(q,{heightAt:(x,z)=>q.heightBase+((x+z)&3),
 terrainAt:(x,z)=>{const i=x*50+z;if(i<0||i>=2500)return 0;x=Math.floor(i/50);z=i%50;return (x-z)%7===0?3:[2,19,21,22][(x+z)%4];},
 marksAt:(x,z)=>(x+z)%6===0?0x100:0,kindAt:code=>code===3?13:0,categoryAt:code=>[21,22].includes(code)?16:0,
 baseSizeAt:packed.baseSizeAt,expansionAt:packed.expansionAt,objectAt:packed.objectAt});
 if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,a,e}));
}console.log('300 complete original scenery sampling loops match references, counters and RNG.');
""".replace('MODULE',json.dumps(module)).replace('READER',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-planner-world-records.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
