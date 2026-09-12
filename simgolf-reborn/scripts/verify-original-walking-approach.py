"""Continuous native destination preparation through arrival; only cleanup controlled."""
from pathlib import Path
import hashlib,json,random,struct,subprocess,pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_ESI,UC_X86_REG_EAX,UC_X86_REG_EIP,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
end=None;calls=[];arrived=None
def hook(u,a,size,data):
 global end,arrived
 if a==0x429f4c:arrived=dict(destination=dict(x=u.reg_read(UC_X86_REG_EBX),z=u.reg_read(UC_X86_REG_ESI)),delta=dict(x=u.reg_read(UC_X86_REG_EBX)-get(0x577f08+id*256),z=u.reg_read(UC_X86_REG_ESI)-get(0x577f0c+id*256)))
 if a in [0x4295ef,0x42a71c,0x42bdb5,0x42a019]:end='skip' if a==0x4295ef else hex(a);u.emu_stop()
 if a in [0x425b50,0x40daa0,0x40db60]:
  sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,2 if a==0x425b50 else 4)];calls.append(dict(address=a,args=args))
  if a==0x425b50:
   u.mem_write(0x577f29+args[0]*256,b'\0');put(0x568f6c,get(0x568f6c)+17);u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(4290);rows=[]
for i in range(500):
 b=bytearray(152*256);h=bytearray(20*520);f=bytearray(4096);t=bytes(rng.choices([1,10,17],k=2500));marks=[512 if rng.randrange(20)==0 else 0 for _ in range(2500)];widths=[2]*16;metadata=[dict(shotClass=rng.choice([-1,0,1])) for _ in range(21)];id=i%2
 for j in range(8):
  off=j*256;b[off+0x29]=rng.choice([1,1,2,19]);b[off+0x2a]=rng.choice([0,0,1]);b[off+0x21]=rng.randrange(8);b[off+0x20]=rng.choice([0,0,32]);b[off+0x25]=rng.choice([0,11,12,13]);struct.pack_into('<h',b,off+0xaa,j^1);struct.pack_into('<h',b,off+0xc6,rng.randrange(100))
  for offset in [8,12,0xdc,0xe0]:struct.pack_into('<i',b,off+offset,24000+rng.randrange(-1000,1000))
  if rng.randrange(2)==0:struct.pack_into('<i',b,off+0xdc,0)
  struct.pack_into('<i',b,off+0xe4,rng.choice([0,0,100]));struct.pack_into('<I',b,off+0xe8,rng.getrandbits(32));struct.pack_into('<I',b,off+0x18,rng.choice([0,0,0x400,0x4000,0x1000,0x2000000]))
  for offset in [0xae,0xb0,0xb2]:struct.pack_into('<h',b,off+offset,rng.randrange(150))
 for j in range(20):
  h[j*520]=rng.choice([0,4,4]);h[j*520+1]=rng.randrange(8)
  for offset in [8,12,16,20,24,28]:struct.pack_into('<i',h,j*520+offset,rng.randrange(15,35))
 for j in range(256):struct.pack_into('<hhh',f,j*16,rng.choice([-1,3,6,7,8,10]),rng.randrange(10,40),rng.randrange(10,40));f[j*16+7]=rng.choice([0,64,64,64])
 q=dict(actorId=id,ballTerrain=rng.choice([1,10]),queueClock=100,waitingGroups=0,followPartner=0,cupHeading=0,walkingOverride=rng.randrange(2),movementReady=1,selectionState=rng.choice([-1,id]),worldFlags=0,seed=rng.getrandbits(32),type6Available=1,type8Available=1,type10Available=1,serviceIndex=-1,nearestFacilityDistance=65535,serviceTileX=-1,serviceTileZ=37)
 u.mem_write(0x58a6e8,bytes(32));u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,bytes(h));u.mem_write(0x58a708,bytes(f));u.mem_write(0x570d38,t);u.mem_write(0x53ba00,struct.pack('<2500H',*marks))
 for j in range(16):u.mem_write(0x4c16b8+j*20,bytes([2]))
 for j,m in enumerate(metadata):u.mem_write(0x576dc2+j*48,bytes([m['shotClass']&255]))
 for address,value in [(0x568f6c,100),(0x5a4440,q['selectionState']),(0x59d208,0),(0x820454,q['seed']),(0x542bc8,1),(0x542bd0,1),(0x542bd8,1),(0x5679bc,65535),(0x56936c,-1),(0x569370,37)]:put(address,value)
 for off,value in [(0x10,id),(0x14,q['ballTerrain']),(0x1c,-1),(0x24,0),(0x34,q['walkingOverride']),(0x38,0),(0x44,1),(0x78,0)]:put(0x102000+off,value)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_EAX,b[id*256+0x29]);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;calls=[];arrived=None;u.emu_start(0x4290ca,0x400fff,count=100000);assert end
 e=dict(actors=list(u.mem_read(0x577f00,len(b))),waitingGroups=get(0x102038),followPartner=get(0x102024),cupHeading=get(0x102078)&0xffffffff,movementReady=get(0x102044),serviceIndex=get(0x10201c),seed=get(0x820454)&0xffffffff,calls=calls,next=end)
 e.update(queueClock=get(0x568f6c),nearestFacilityDistance=get(0x5679bc),serviceTileX=get(0x56936c),serviceTileZ=get(0x569370))
 # Capture corrected destination before arrival facing reuses EBX/ESI.
 if arrived:e.update(destination=arrived['destination'],delta=arrived['delta'],distance=get(0x102070))
 rows.append([q,list(b),list(h),list(f),list(t),marks,widths,metadata,e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingApproach}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));const coverage={};for(const [q,b,h,f,t,m,w,metadata,e] of rows){const r=originalWalkingApproach({...q,actors:Array.from({length:152},(_,i)=>new Uint8Array(b.slice(i*256,(i+1)*256))),holes:Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520))),facilityRecords:new Uint8Array(f),facilityPrefix:new Uint8Array(32),facilityWidths:w,terrain:new Uint8Array(t),tileFlags:new Uint16Array(m),metadata},(event,state)=>{state.actors[event.args[0]][0x29]=0;state.queueClock=(state.queueClock+17)|0;return {state};});const a={actors:r.state.actors.flatMap(b=>Array.from(b)),waitingGroups:r.waitingGroups,followPartner:r.followPartner,cupHeading:r.cupHeading,movementReady:r.movementReady??q.movementReady,serviceIndex:r.serviceIndex??q.serviceIndex,seed:r.state.seed,calls:r.calls,next:r.next};Object.assign(a,{queueClock:r.state.queueClock,nearestFacilityDistance:r.state.nearestFacilityDistance,serviceTileX:r.state.serviceTileX,serviceTileZ:r.state.serviceTileZ});if(r.destination){a.destination=r.destination;a.delta=r.delta;a.distance=r.distance;}coverage[r.next]=(coverage[r.next]??0)+1;for(const call of r.calls){const key=call.address.toString(16)+(call.address===0x40daa0?':'+call.args[0]:'');coverage[key]=(coverage[key]??0)+1;}if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k])),actual:{...a,actors:undefined,calls:undefined},expected:{...e,actors:undefined,calls:undefined}}));}console.log(`${rows.length} continuous native walking approaches match. ${JSON.stringify(coverage)}`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-approach.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
