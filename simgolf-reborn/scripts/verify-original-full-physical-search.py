"""Verify full original route search with actual candidate planning and flight."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,sys
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_ESI,UC_X86_REG_EBX,UC_X86_REG_EIP,UC_X86_REG_FPCW,UC_X86_REG_EAX,UC_X86_REG_EDI,UC_X86_REG_ECX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x200000);u.mem_map(0x820000,0x1000);u.mem_map(0x100000,0x10000)
for a,n in [(0x42245e,0x115a),(0x4235c0,0x2572),(0x421b50,0x8f8),(0x406e80,0x1d0),(0x421870,0x167),(0x405710,0x4e),(0x45ba70,0x60),(0x4b9800,8),(0x4219e0,0x168),(0x421450,0x420),(0x466a00,0x50),(0x491380,0x3c),(0x4913e0,0x10b),(0x466b40,0x59),(0x4baa48,16),(0x466ba0,0x10e),(0x40bc50,0x33),(0x40a9f0,0x81),(0x40c1a0,0x42),(0x4a57a0,0x27),(0x4c1870,64)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_write(0x483330,b'\xc3')
for a in [0x42f110,0x40c140,0x40be60]:u.mem_write(a,b'\x31\xc0\xc3')
u.mem_map(0x839000,0x1000);u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000)
def write(a,v,size=4):u.mem_write(a,(v&((1<<(size*8))-1)).to_bytes(size,'little'))
def read(a):return struct.unpack('<i',u.mem_read(a,4))[0]
with_target_result='--with-target-result' in sys.argv
remaining=0;lie=0;calls=[];current={};sampleIndex=0;passes=[];searchDiagnostics=0;searchWinner={};assessmentCalls=0
def hook(u,a,s,d):
 global remaining,lie,calls,sampleIndex,searchDiagnostics,searchWinner,assessmentCalls
 if a==0x4234eb:searchDiagnostics=read(0x5a5b88);searchWinner=dict(score=read(0x102060),target=dict(x=read(0x102078),z=read(0x1020a4)),curve=read(0x10206c),cornerTarget=read(0x5a8730),landing=dict(x=read(0x5a7270),z=read(0x5a7278)),landingFlag=read(0x1020ac))
 if a==0x423582:u.emu_stop()
 if a==0x4227b1:passes.append(read(0x102038))
 if a==0x421b50:
  sp=u.reg_read(UC_X86_REG_ESP);ret,actor,x,z,curve=struct.unpack('<5i',u.mem_read(sp,20))
  calls.append(dict(type='simulate',actorId=actor,x=x,z=z,curve=curve))
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
 l=q['launch']
 for off,key in [(0xfc,'abilityValue'),(0xfa,'driverValue'),(0xfb,'ironValue'),(0xfd,'drawValue'),(0xfe,'fadeValue'),(0xff,'backspinValue'),(0x100,'recoveryValue')]:write(0x577f00+off,l[key],1)
 write(0x578001,5,1);write(0x577fe8,l['heading']);write(0x577fe4,0)
 for address,key in [(0x5a3228,'globalFlags'),(0x542bc8,'difficulty'),(0x542bd0,'accuracySetting'),(0x53ce64,'obstacleCount')]:write(address,l[key])
 write(0x5a4440,0 if l['activeActor'] else 154);write(0x5a1f30,l['variant'],1)
 for a in range(0x59e6b0,0x5a1f30,0x388):write(a,65535,2)
 for a in [0x5a3200,0x567278,0x53ec30]:u.mem_write(a,bytes(40))
 write(0x5a8728,0);write(0x820454,q['seed']);u.mem_write(0x5608b0,bytes(2500))
 for code in range(23):write(0x576dc0+code*48,3,1);write(0x576dc1+code*48,0,1)
 r=q['rangeInput']
 for offset,key in [(0xc2,'level'),(0xf8,'power'),(0xf9,'longDrive'),(0x3e,'boost')]:write(0x577f00+offset,r[key],1)
 write(0x542bd8,r['lengthBonus'])
 surface=next(c[2] for c in q['cells'] if c[:2]==[q['origin']['x']>>10,q['origin']['z']>>10])
 write(0x400104,surface)
 u.mem_write(0x40bc90,b'\xa1'+struct.pack('<I',0x400104)+b'\xc3')
 write(0x102030,0);write(0x577fd4,q['previousTarget']['x']);write(0x577fd8,q['previousTarget']['z'])
 u.reg_write(UC_X86_REG_ESI,0);u.reg_write(UC_X86_REG_EAX,11);u.reg_write(UC_X86_REG_EBX,1);u.reg_write(UC_X86_REG_ECX,q['mode']);u.reg_write(UC_X86_REG_EDI,q['hole']);u.reg_write(UC_X86_REG_EBP,q['origin']['x']>>10)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_FPCW,0x37f)
 u.emu_start(0x42245e,0x4235b8,count=500000000)
 assert u.reg_read(UC_X86_REG_EIP)==0x423582, (hex(u.reg_read(UC_X86_REG_EIP)),len(calls))
 search=dict(scores=[list(struct.unpack('<6i',u.mem_read(0x1020bc+i*24,24))) for i in range(441)],distances=[list(struct.unpack('<6i',u.mem_read(0x104a14+i*24,24))) for i in range(441)],flags=[list(struct.unpack('<6I',u.mem_read(0x10736c+i*24,24))) for i in range(441)],work=read(0x102044),winner=searchWinner,searchFlag=read(0x5a872c),followupFlag=read(0x1020b4),samples=read(0x102038),diagnostics=searchDiagnostics,passes=passes)
 cache=dict(next=read(0x5a8728),entries=[dict(distance=read(0x5a3200+i*4),verticalSpeed=read(0x567278+i*4),speed=read(0x53ec30+i*4)) for i in range(10)])
 shared=dict(seed=read(0x820454)&0xffffffff,landing=dict(x=read(0x5691dc),z=read(0x5691e0)),cache=cache,shotClassOverrides=[dict(code=c,shotClass=u.mem_read(0x576dc2+c*48,1)[0]) for c in [17,20]] if calls else [])
 result=dict(search=search,shared=shared,result=dict(target=dict(x=read(0x577fd4),z=read(0x577fd8)),curve=struct.unpack('<i',struct.pack('<I',u.reg_read(UC_X86_REG_EAX)))[0],cornerTarget=read(0x5a8730),diagnostics=read(0x5a5b88),worldFlags=read(0x59d208)&0xffffffff,mode=read(0x5a870c),candidateSkillMask=read(0x4c1e0c)))

 if with_target_result:
  # Resume the actual caller result block with search-mutated actor/shared
  # memory intact. Supply its separate caller scratch score buffer explicitly.
  sp=0x10d000
  write(sp+0x1c,q['aimScore']);u.mem_write(sp+0x158,bytes(v&255 for v in q['aimScores']))
  u.reg_write(UC_X86_REG_ESI,q['actorId']<<8);u.reg_write(UC_X86_REG_ESP,sp)
  u.reg_write(UC_X86_REG_EAX,result['result']['cornerTarget'])
  u.emu_start(0x423863,0x4239cf,count=3000)
  assert u.reg_read(UC_X86_REG_EIP)==0x4239cf
  result['aim']=dict(dx=read(sp+0x38),dz=read(sp+0x28),actorFlags=read(0x577f18)&0xffffffff,
   score=read(sp+0x1c),heading=read(0x577fe8)&0xffffffff,distance=read(sp+0x10))
 return result

rows=[]
base=json.loads((root/'simgolf-reborn/scene/tests/fixtures/original-assessed-route-search.json').read_text())[0][0]
launchBase=json.loads((root/'simgolf-reborn/scene/tests/fixtures/original-contiguous-candidate.json').read_text())[0][0]
for mode,scenario in [(2,'clear'),(1,'clear'),(0,'clear'),(2,'mixed'),(1,'mixed'),(1,'mixed-pro')]:
 q={**base,'mode':mode,'seed':1234567,'shotCounter':1,'shot':1,'skillMask':3 if mode==2 else 7,'actorClass':0,'actorFlags':0,'abilityFlags':0}
 q['scenario']=scenario
 if scenario=='mixed-pro':q.update(actorClass=1,abilityFlags=0x63)
 if scenario.startswith('mixed'):
  q['cells']=[]
  for x in range(50):
   for z in range(50):
    code,cls=(17,2) if x in [24,25] and 18<=z<=32 else (3,1) if x==27 and z%3 else (4,2) if (x+z)%11==0 else (2,0)
    q['cells'].append([x,z,code,cls,0x82 if x==30 and z==25 else 0])
 q['launch']={**launchBase,'actorId':q['actorId'],'x':q['origin']['x'],'z':q['origin']['z'],'actorFlags':q['actorFlags'],'actorClass':q['actorClass'],'skillMask':q['skillMask'],'abilityFlags':q['abilityFlags'],'shotCounter':q['shotCounter'],'attitude':q['rangeInput']['boost'],'level':q['level'],'cup':q['cup']}
 q['launch']['rangeInput']={**q['rangeInput'],'skillMask':q['skillMask'],'shot':q['shotCounter'],'professional':q['actorClass']!=0,'abilityFlags':q['abilityFlags']}
 if with_target_result:q.update(aimScore=93,aimScores=[((x*17+z*13)%256)-128 for x in range(50) for z in range(50)])
 e=run(q);rows.append([q,e]);print('Original full search finished',scenario,mode,len(calls),flush=True)
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalPhysicalRouteSearch,originalPhysicalTargetSearch}=await import(PHYSICAL),{originalShotMap}=await import(MAP),{originalStrengthCache}=await import(CACHE);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){
const metadata=new Map(q.cells.map(c=>[c[2],{shotClass:c[3],kind:c[2]===3?13:0}]));if(!metadata.has(20))metadata.set(20,{shotClass:q.excludedClass,kind:0});
const map=originalShotMap({terrain:Uint8Array.from(q.cells.map(c=>c[2])),marks:Uint16Array.from(q.cells.map(c=>c[4])),derived:{edgeMasks:new Uint8Array(2500),surfaceHeights:new Int8Array(2500),directionHeights:new Int8Array(20000)},readHeight:()=>0,globalFlags:0,readRawTerrain:()=>0,metadata:code=>({...metadata.get(code),flags:0,bounceCoefficient:3,rollCoefficient:0})});
const shared={seed:q.seed,landing:q.landing,cache:originalStrengthCache(),shotClassOverrides:[]};
const dependencies={launch:q.launch,physical:{professional:q.actorClass!==0,abilityFlags:q.abilityFlags,luck:5},map,shared};
const actual=q.aimScores?originalPhysicalTargetSearch(q,dependencies,{score:q.aimScore,scoreAt:(x,z)=>q.aimScores[x*50+z]}):originalPhysicalRouteSearch(q,dependencies);
if(!isDeepStrictEqual(actual,e)){
 const mismatches=[];function compare(a,b,path=''){if(isDeepStrictEqual(a,b))return;if(a&&b&&typeof a==='object'&&typeof b==='object')for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],path+'.'+k);else if(mismatches.length<20)mismatches.push({path,a,b});}compare(actual,e);throw Error(JSON.stringify(mismatches));}
}console.log('Full physical search and requested caller handoff match original execution.');
""".replace('PHYSICAL',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-physical-candidates.js').as_uri())).replace('MAP',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-shot-map.js').as_uri())).replace('CACHE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-strength-search.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in __import__('sys').argv:
 (root/('simgolf-reborn/scene/tests/fixtures/original-full-physical-target-search.json' if with_target_result else 'simgolf-reborn/scene/tests/fixtures/original-full-physical-search.json')).write_text(json.dumps(rows,separators=(',',':'))+'\n')
