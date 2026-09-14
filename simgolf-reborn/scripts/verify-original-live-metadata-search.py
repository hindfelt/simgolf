"""Verify live terrain-class changes from candidate callbacks during search."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_FPCW,UC_X86_REG_EAX,UC_X86_REG_EDI,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x820000,0x1000);u.mem_map(0x100000,0x10000)
for a,n in [(0x42245e,0x115a),(0x4219e0,0x168),(0x421450,0x420),(0x466a00,0x50),(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16),(0x466ba0,0x10e),(0x40bc50,0x33),(0x40a9f0,0x81),(0x40c1a0,0x42),(0x4a57a0,0x27),(0x4c1870,64)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_write(0x483330,b'\xc3')
u.mem_map(0x839000,0x1000);u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
remaining=0;lie=0;calls=[];current={};sampleIndex=0;passes=[];searchDiagnostics=0;searchWinner={};assessmentCalls=0
def hook(u,a,s,d):
 global remaining,lie,calls,sampleIndex,searchDiagnostics,searchWinner,assessmentCalls
 if a==0x4234eb:searchDiagnostics=read(0x5a5b88);searchWinner=dict(score=read(0x102060),target=dict(x=read(0x102078),z=read(0x1020a4)),curve=read(0x10206c),cornerTarget=read(0x5a8730),landing=dict(x=read(0x5a7270),z=read(0x5a7278)),landingFlag=read(0x1020ac))
 if a==0x423582:u.emu_stop()
 if a==0x4227b1:passes.append(read(0x102038))
 if a==0x421b50:
  sp=u.reg_read(UC_X86_REG_ESP);ret,actor,x,z,curve=struct.unpack('<5i',u.mem_read(sp,20))
  calls.append(dict(type='simulate',actorId=actor,x=x,z=z,curve=curve))
  landing=current['landings'][sampleIndex%len(current['landings'])];sampleIndex+=1
  for code in [17,20]:write(0x576dc2+48*code,8,1)
  write(0x5691dc,landing['x']);write(0x5691e0,landing['z'])
  u.reg_write(UC_X86_REG_ESP,sp+4);u.reg_write(UC_X86_REG_EIP,ret)
 if a==0x422e99:lie=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EDI)))[0]
 if a==0x421450:assessmentCalls+=1
 if a==0x422e88:remaining=u.reg_read(UC_X86_REG_EAX)
u.hook_add(UC_HOOK_CODE,hook)
def run(q):
 global current,calls,sampleIndex,passes
 current=q;calls=[];sampleIndex=0;passes=[]
 u.mem_write(0x102000,bytes(0x9000));u.mem_write(0x570d38,bytes([2])*2500)
 for x,z,code,cls,flags in q['cells']:
  write(0x570d38+x*50+z,code,1);write(0x576dc2+48*code,cls,1);write(0x576dc6+48*code,13 if code==3 else 0,1);write(0x53ba00+2*(x*50+z),flags,2)
 write(0x577182,q['excludedClass'],1);write(0x577f21,q['skillMask'],1)
 write(0x577f29,q['hole'],1);write(0x574518+q['hole']*520,q['cup']['x']);write(0x57451c+q['hole']*520,q['cup']['z'])
 write(0x5691dc,q['landing']['x']);write(0x5691e0,q['landing']['z'])
 write(0x10201c,q['score']);write(0x102028,q['goodLandings']);write(0x102068,q['distanceDivisor'])
 for off,v in [(0x40,q['heading']),(0x80,q['hole']*520),(0x10,int(q['cornerTarget'])),(0x18,q['target']['z']),(0x2c,q['target']['x']),(0x74,q['target']['z']<<10),(0x84,q['target']['x']<<10)]:write(0x102000+off,v)
 for off,v in [(0x38,q['samples']),(0x88,int(q['beyondTwoShots'])),(0x4c,q['range']),(0x3c,q['shapeMask']),(0xb4,q['followupFlag'])]:write(0x102000+off,v)
 write(0x577f2a,q['shot'],1);write(0x5a870c,q['mode'])
 w=q['winner']
 for off,v in [(0xbc,q['score']),(0x14,q['curve']),(0x7cc8,q['actorId']),(0x44,q['work']),(0x60,w['score']),(0x78,w['target']['x']),(0xa4,w['target']['z']),(0x6c,w['curve']),(0xac,w['landingFlag'])]:write(0x102000+off,v)
 for a,v in [(0x820344,q['level']),(0x5a872c,q['searchFlag']),(0x5a8730,w['cornerTarget']),(0x5a7270,w['landing']['x']),(0x5a7278,w['landing']['z'])]:write(a,v)
 for i in range(441):
  for j in range(6):
   write(0x1020bc+(i*6+j)*4,q['scores'][i][j]);write(0x104a14+(i*6+j)*4,q['distances'][i][j]);write(0x10736c+(i*6+j)*4,q['flags'][i][j])
 for off,v in [(0x54,q['anchor']['x']),(0x8c,q['anchor']['z']),(0x90,q['origin']['x']>>10),(0x58,q['origin']['z']>>10),(0xa0,q['previousTarget']['x']),(0xa8,q['previousTarget']['z']),(0x5c,q['cupDistance'])]:write(0x102000+off,v)
 write(0x577fdc,q['origin']['x']);write(0x577fe0,q['origin']['z']);write(0x577f18,q['actorFlags'])
 write(0x10207c,q['distance']);write(0x102094,0x400100);write(0x400100,11,1);write(0x576dc2+11*48,q['originClass'],1);write(0x4c1fb8,-1)
 write(0x5a5b88,q['diagnostics']);write(0x59d208,q['worldFlags'])
 write(0x577f20,q['actorClass'],1);write(0x577f1e,q['abilityFlags'],2);write(0x577f2a,q['shotCounter'],1)
 r=q['rangeInput']
 for offset,key in [(0xc2,'level'),(0xf8,'power'),(0xf9,'longDrive'),(0x3e,'boost')]:write(0x577f00+offset,r[key],1)
 write(0x542bd8,r['lengthBonus'])
 surface=next(c[2] for c in q['cells'] if c[:2]==[q['origin']['x']>>10,q['origin']['z']>>10])
 write(0x400104,surface)
 u.mem_write(0x40bc90,b'\xa1'+struct.pack('<I',0x400104)+b'\xc3')
 write(0x102030,0);write(0x577fd4,q['previousTarget']['x']);write(0x577fd8,q['previousTarget']['z'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_EAX,11);u.reg_write(UC_X86_REG_EBX,1);u.reg_write(UC_X86_REG_ECX,q['mode']);u.reg_write(UC_X86_REG_EDI,q['hole']);u.reg_write(UC_X86_REG_EBP,q['origin']['x']>>10)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_FPCW,0x37f)
 u.emu_start(0x42245e,0x4235b8,count=50000000)
 assert u.reg_read(UC_X86_REG_EIP)==0x423582, (hex(u.reg_read(UC_X86_REG_EIP)),len(calls))
 search=dict(scores=[list(struct.unpack('<6i',u.mem_read(0x1020bc+i*24,24))) for i in range(441)],distances=[list(struct.unpack('<6i',u.mem_read(0x104a14+i*24,24))) for i in range(441)],flags=[list(struct.unpack('<6I',u.mem_read(0x10736c+i*24,24))) for i in range(441)],work=read(0x102044),winner=searchWinner,searchFlag=read(0x5a872c),followupFlag=read(0x1020b4),samples=read(0x102038),diagnostics=searchDiagnostics,passes=passes)
 return dict(search=search,result=dict(target=dict(x=read(0x577fd4),z=read(0x577fd8)),curve=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EAX)))[0],cornerTarget=read(0x5a8730),diagnostics=read(0x5a5b88),worldFlags=read(0x59d208)&0xffffffff,mode=read(0x5a870c),candidateSkillMask=read(0x4c1e0c)))

rng=random.Random(2002);rows=[]
for _ in range(30):
 cells=[]
 for x in range(24,27):
  for z in range(24,27):cells.append([x,z,2+len(cells),rng.randrange(-1,4),rng.choice([0,0x82,0x83,0x482])])
 q=dict(landing=dict(x=25*1024+rng.randrange(1024),z=25*1024+rng.randrange(1024)),cup=dict(x=30,z=25),hole=2,skillMask=rng.randrange(8),excludedClass=32,distanceDivisor=rng.choice([2,4,6]),score=rng.randrange(-20,20),goodLandings=rng.randrange(10),cells=cells)
 q.update(target=dict(x=rng.randrange(20,31),z=rng.randrange(20,31)),cornerTarget=bool(rng.randrange(2)),heading=rng.randrange(2**32))
 q.update(samples=rng.choice([2,4,8]),mode=rng.randrange(3),beyondTwoShots=bool(rng.randrange(2)),range=rng.randrange(1,331),shapeMask=rng.randrange(4),followupFlag=rng.randrange(2),shot=rng.randrange(4),costs=[rng.randrange(100) for _ in range(3)])
 q.update(cornerTarget=rng.randrange(2),actorId=0,curve=rng.randrange(-1,2),work=rng.randrange(1000),level=rng.randrange(4),searchFlag=rng.randrange(2),landings=[dict(x=25600+rng.randrange(1024),z=25600+rng.randrange(1024)) for _ in range(q['samples'])],winner=dict(score=rng.randrange(-100,2000),target=dict(x=10,z=11),curve=0,cornerTarget=0,landing=dict(x=10000,z=11000),landingFlag=0))
 q.update(distance=rng.randrange(401),originClass=rng.randrange(-1,3),scores=[rng.choice([0,99999,100000,rng.randrange(100)]) for _ in range(6)],distances=[rng.randrange(300) for _ in range(6)],flags=[rng.randrange(2**32) for _ in range(6)])
 q['landings']*=6
 q.update(anchor=dict(x=25,z=25),origin=dict(x=20992,z=26112),previousTarget=dict(x=25,z=25),actorFlags=rng.randrange(2),cupDistance=250,range=250,originClass=0,
  cells=[[x,z,2,0,0] for x in range(50) for z in range(50)],scores=[[100000]*6 for _ in range(441)],distances=[[0]*6 for _ in range(441)],flags=[[0]*6 for _ in range(441)])
 if _%2:
  types=[(2,0),(3,1),(4,2),(20,32)]
  q['cells']=[[x,z,*types[(x*3+z)%4],0x82 if (x+z)%5==0 else 0] for x in range(50) for z in range(50)]
 if _==0:q['scores']=[[0]*6 for _ in range(441)]
 for i in rng.sample(range(441),15):q['scores'][i]=[0]*6 if rng.randrange(2) else [rng.randrange(1,100) for _ in range(6)]
 q.update(diagnostics=rng.randrange(8),shotClass=0,actorClass=rng.choice([0,1]),abilityFlags=rng.randrange(128),shotCounter=q['shot'],followingRange=rng.randrange(1,331),worldFlags=rng.randrange(2**32))
 if _==29:
  q['cells']=[[x,z,20,32,0] for x in range(50) for z in range(50)]
 q['rangeInput']=dict(difficulty=q['level'],level=rng.randrange(9),power=rng.randrange(16),longDrive=rng.randrange(16),boost=rng.randrange(-2,6),lengthBonus=rng.randrange(5))
 if _==0:q['shotCounter']=255;q['shot']=255
 rows.append([q,run(q),calls])
assert assessmentCalls>0,'No original assessment calls exercised'
print(f'{assessmentCalls} original follow-up assessments executed.')
module=(root/'simgolf-reborn/scene/src/simulation/original-route-search.js').as_uri()
script='''import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalAssessedRouteSearch}=await import(MODULE);
const rows=JSON.parse(readFileSync(0,'utf8'));
for(const [q,e,expectedCalls] of rows){const patches=new Map();const cells=new Map(q.cells.map(([x,z,code,shotClass,flags])=>[`${x},${z}`,{code,shotClass,flags,kind:code===3?13:0}]));
 let index=0;const calls=[];const a=originalAssessedRouteSearch({...q,assessShot:c=>{calls.push({type:"assess",...c});return q.costs[c.shape+1]+c.flag*3;},terrainAt:p=>{const t=cells.get(`${p.x},${p.z}`);return {...t,shotClass:patches.get(t.code)??t.shotClass};},shotClassAt:code=>patches.get(code)??(q.cells.find(c=>c[2]===code)?.[3]??(code===20?q.excludedClass:undefined))},c=>{calls.push({type:"simulate",...c});patches.set(17,8);patches.set(20,8);return {landing:q.landings[(index++)%q.landings.length]};});
 if(!isDeepStrictEqual(a,e)||JSON.stringify(calls)!==JSON.stringify(expectedCalls))throw Error(JSON.stringify({a,e}));
}console.log(`${rows.length} live-metadata searches and ordered flight calls match original x86.`);
'''.replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)

if '--write-fixture' in __import__('sys').argv:
 fixtures=[];seen=set()
 for row in rows:
  key=(tuple(row[1]['search']['passes']),row[0]['mode']==2,row[1]['search']['winner']['target']['x']==-1)
  if key not in seen:fixtures.append(row);seen.add(key)
 (root/'simgolf-reborn/scene/tests/fixtures/original-live-metadata-search.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
