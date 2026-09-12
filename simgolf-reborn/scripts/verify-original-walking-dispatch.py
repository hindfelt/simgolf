"""Continuous native destination preparation through short/long walking; selected effects controlled."""
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
 if a==0x42a019 and get(0x10201c)>=0:return
 if a in [0x4295ef,0x42bdb5,0x42a019,0x42adac,0x42d23c,0x42b825]:end='skip' if a==0x4295ef else hex(a);u.emu_stop()
 if a in [0x425b50,0x40daa0,0x40db60,0x46c140,0x4672d0,0x40c1f0,0x40c140,0x42def0,0x40c580]:
  sp=u.reg_read(UC_X86_REG_ESP);args=[get(sp+4*j) for j in range(1,2 if a in [0x425b50,0x46c140] else 6 if a==0x42def0 else 5 if a in [0x40c1f0,0x40c580] else 4)];calls.append(dict(address=a,args=args))
  if a==0x425b50:
   u.mem_write(0x577f29+args[0]*256,b'\0');put(0x568f6c,get(0x568f6c)+17);u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)
  if a in [0x46c140,0x4672d0,0x40c1f0,0x40c140,0x40c580]:
   if a==0x4672d0:u.mem_write(0x577f78+args[0]*256,bytes([36]))
   u.reg_write(UC_X86_REG_EAX,1);u.reg_write(UC_X86_REG_EIP,get(sp));u.reg_write(UC_X86_REG_ESP,sp+4)

for address in [0x429f4c,0x4295ef,0x42bdb5,0x42a019,0x42adac,0x42d23c,0x42b825,0x425b50,0x40daa0,0x40db60,0x46c140,0x4672d0,0x40c1f0,0x40c140,0x42def0,0x40c580]:u.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
rng=random.Random(4290);rows=[]
for i in range(500):
 b=bytearray(152*256);h=bytearray(20*520);f=bytearray(4096);t=bytes(rng.choices([1,10,17],k=2500));marks=[512 if rng.randrange(20)==0 else 0 for _ in range(2500)];widths=[2]*16;metadata=[dict(shotClass=rng.choice([-1,0,1]),walkingCost=1) for _ in range(21)];id=i%2
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
 if i%5==0:
  struct.pack_into('<ii',b,id*256+8,23*1024+512,23*1024+512);struct.pack_into('<i',b,id*256+0xdc,0);b[id*256+0x29]=1;b[id*256+0x2a]=0;struct.pack_into('<hh',b,id*256+0xae,150,150);h[520]=4;struct.pack_into('<hhh',f,0,7,23,23);f[7]=64
 q=dict(actorId=id,ballTerrain=rng.choice([1,10]),queueClock=100,waitingGroups=0,followPartner=0,cupHeading=0,walkingOverride=rng.randrange(2),movementReady=1,selectionState=rng.choice([-1,id]),worldFlags=0,seed=rng.getrandbits(32),type6Available=1,type8Available=1,type10Available=1,serviceIndex=-1,nearestFacilityDistance=65535,serviceTileX=-1,serviceTileZ=37)
 ax,az=struct.unpack_from('<ii',b,id*256+8);q.update(actorIndex=(ax>>10)*50+(az>>10),actorTile=dict(x=ax>>10,z=az>>10),nextTerrain=1,reversalCheck=1,avoidanceCursor=0,difficulty=1,fastWalking=0,cartUpgrade=0,cachedFlags=struct.unpack_from('<I',b,id*256+0x18)[0],phaseCounter=i);put(0x5a446c,0);put(0x820344,1);put(0x599a9c,0);put(0x831828,i);put(0x10202c,1);put(0x10203c,q['actorIndex']);put(0x102040,ax>>10);put(0x10204c,az>>10);put(0x102050,q['cachedFlags']);u.mem_write(0x576dc5+48,bytes([1]));u.mem_write(0x58a6e8,bytes(32));u.mem_write(0x577f00,bytes(b));u.mem_write(0x574500,bytes(h));u.mem_write(0x58a708,bytes(f));u.mem_write(0x570d38,t);u.mem_write(0x53ba00,struct.pack('<2500H',*marks))
 q.update(cashUnits=1000,ledgerPeriod=0,type6Level=1,type8Level=1,type10Level=1);put(0x570a24,1000);put(0x5a5784,0);put(0x582c64,0);put(0x5a7698,1);put(0x5a76a0,1);put(0x5a76a8,1);u.mem_write(0x577254,bytes(2500))
 u.mem_write(0x53aabc,bytes([2]*2500));put(0x838684,0)
 for j in range(21):u.mem_write(0x576dc6+j*48,bytes([0]))
 for j in range(16):u.mem_write(0x4c16b8+j*20,bytes([2]))
 for j,m in enumerate(metadata):u.mem_write(0x576dc2+j*48,bytes([m['shotClass']&255]))
 for address,value in [(0x568f6c,100),(0x5a4440,q['selectionState']),(0x59d208,0),(0x820454,q['seed']),(0x542bc8,1),(0x542bd0,1),(0x542bd8,1),(0x5679bc,65535),(0x56936c,-1),(0x569370,37)]:put(address,value)
 for off,value in [(0x10,id),(0x14,q['ballTerrain']),(0x1c,-1),(0x24,0),(0x34,q['walkingOverride']),(0x38,0),(0x44,1),(0x78,0)]:put(0x102000+off,value)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.reg_write(UC_X86_REG_EAX,b[id*256+0x29]);u.reg_write(UC_X86_REG_FPCW,0x37f);end=None;calls=[];arrived=None;u.emu_start(0x4290ca,0x400fff,count=10000000);assert end
 e=dict(actors=list(u.mem_read(0x577f00,len(b))),seed=get(0x820454)&0xffffffff,calls=calls,next=end,cashUnits=get(0x570a24),serviceIncome=struct.unpack('<h',u.mem_read(0x582c64,2))[0])
 rows.append([q,list(b),list(h),list(f),list(t),marks,widths,metadata,e])
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalWalkingDispatch}=await import(MODULE);const rows=JSON.parse(readFileSync(0,'utf8'));const coverage={};for(const [q,b,h,f,t,m,w,metadata,e] of rows){const r=originalWalkingDispatch({...q,actors:Array.from({length:152},(_,i)=>new Uint8Array(b.slice(i*256,(i+1)*256))),holes:Array.from({length:20},(_,i)=>new Uint8Array(h.slice(i*520,(i+1)*520))),facilityRecords:new Uint8Array(f),facilityPrefix:new Uint8Array(32),facilityWidths:w,terrain:new Uint8Array(t),tileFlags:new Uint16Array(m),metadata,traversalCosts:new Int8Array(2500).fill(2),metadataClass:new Uint8Array(128),serviceIncome:new Int16Array(1),tileServiceState:new Uint8Array(2500)},(event,state)=>{if(event.address===0x425b50){state.actors[event.args[0]][0x29]=0;state.queueClock=(state.queueClock+17)|0;}if(event.address===0x4672d0)state.actors[event.args[0]][0x78]=36;return {state,value:1};});const a={actors:r.state.actors.flatMap(b=>Array.from(b)),seed:r.state.seed,calls:r.calls,next:r.next,cashUnits:r.state.cashUnits,serviceIncome:r.state.serviceIncome[0]};coverage[r.next]=(coverage[r.next]??0)+1;if(r.calls.some(c=>c.address===0x40c580))coverage.paidServiceVisits=(coverage.paidServiceVisits??0)+1;if(!isDeepStrictEqual(b.slice(q.actorId*256+8,q.actorId*256+16),Array.from(r.state.actors[q.actorId].slice(8,16))))coverage.positionChanges=(coverage.positionChanges??0)+1;if(!isDeepStrictEqual(a,e))throw Error(JSON.stringify({q,fields:Object.keys(e).filter(k=>!isDeepStrictEqual(a[k],e[k])),actual:{...a,actors:undefined,calls:undefined},expected:{...e,actors:undefined,calls:undefined}}));}console.log(`${rows.length} continuous native walking dispatches match. ${JSON.stringify(coverage)}`);""".replace('MODULE',json.dumps((root/'simgolf-reborn/scene/src/simulation/original-walking-dispatch.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
