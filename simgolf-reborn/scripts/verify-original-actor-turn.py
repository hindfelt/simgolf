"""Continuous native actor decisions through walking, shot preparation, swing and ball movement.
Lookup/reaction helpers are controlled replacements; native RNG executes.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP,UC_X86_REG_EBX,UC_X86_REG_EAX,UC_X86_REG_FPCW
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
for a in [0x40dc70,0x4672d0,0x466ea0,0x406dd0,0x465c40,0x406450,0x426b00,0x42f270,0x42f020,0x425b50,0x40c140,0x4235c0,0x42f110,0x4096e0,0x40c1f0,0x409820,0x409780]:u.mem_write(a,b'\xc3')
u.mem_write(0x47edd0,b'\xc2\x14\x00')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def read(a):return struct.unpack('<I',u.mem_read(a,4))[0]
calls=[];response=0;replacement=0;draws=0;sample=None
# Tile sample is fully computed at 4284c7, before terrain dispatch.
next_branch=None;point_index=0;points=[];turn_seen=False
def hook(u,a,size,data):
 global draws,sample,next_branch,point_index,turn_seen,moving
 if a in [0x428ad1,0x428f64,0x429024,0x4290ca,0x429f27,0x42aa30,0x42af66,0x4295e6]:trace.append([hex(a),read(base+0x18),u.reg_read(UC_X86_REG_EAX)])
 if a==0x42bdc3:moving=True
 if a in [0x4235c0,0x42f110,0x4096e0,0x40c1f0,0x409820,0x409780]:
  sp=u.reg_read(UC_X86_REG_ESP);n={0x4235c0:5,0x42f110:2,0x4096e0:1,0x40c1f0:4,0x409820:1,0x409780:1}[a];calls.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4+j*4,4))[0] for j in range(n)]));u.reg_write(UC_X86_REG_EAX,0)
  if a==0x4235c0:put(base+0xe8,0x40000000)
 if a==0x40c140:
  sp=u.reg_read(UC_X86_REG_ESP);calls.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4+j*4,4))[0] for j in range(3)]));u.reg_write(UC_X86_REG_EAX,0)
  if i%3:put(0x59d208,read(0x59d208)^32)
 if a in [0x40daa0,0x40db60,0x42def0,0x425b10]:
  sp=u.reg_read(UC_X86_REG_ESP);n=5 if a==0x42def0 else 1 if a==0x425b10 else 3;calls.append(dict(address=a,args=[struct.unpack('<i',u.mem_read(sp+4+j*4,4))[0] for j in range(n)]))
 if a==0x428992:turn_seen=True
 if a in [0x42b647,0x4295ef]:
  next_branch={0x428ad1:'0x428ad1',0x42b55c:'0x42b55c',0x42b647:'0x42b647',0x42d23c:'0x42d23c',0x42bdb5:'motion',0x4295ef:'0x4295ef' if moving else 'skip'}[a];u.emu_stop()
 if a in [0x42f270,0x42f020,0x47edd0,0x425b50]:
  sp=u.reg_read(UC_X86_REG_ESP)
  if a==0x47edd0:
   calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(5)]));return
  if a==0x425b50:
   calls.append(dict(address=a,args=[read(sp+4)]));u.mem_write(base+0xaa,struct.pack('<h',2));return
  args=[struct.unpack('<i',u.mem_read(sp+4,4))[0],struct.unpack('<i',u.mem_read(sp+8,4))[0]]
  if a==0x42f270:args.append(struct.unpack('<i',u.mem_read(sp+20,4))[0])
  calls.append(dict(address=a,args=args));point=points[point_index];point_index+=1
  put(read(sp+12),point['x']);put(read(sp+16),point['y']);u.reg_write(UC_X86_REG_EAX,int(point['visible']))
 if a==0x45ba70:draws+=1
 if a==0x4284c7:
  index=u.reg_read(UC_X86_REG_EBX);sample=dict(x=index//50,z=index%50,index=index,remarkIndex=(index%50)*50+index//50)
 if a in [0x40dc70,0x4672d0,0x466ea0,0x406dd0,0x465c40,0x406450,0x426b00]:
  sp=u.reg_read(UC_X86_REG_ESP);n={0x40dc70:2,0x4672d0:3,0x466ea0:1,0x406dd0:3,0x465c40:2,0x406450:1,0x426b00:1}[a];calls.append(dict(address=a,args=[read(sp+4+j*4) for j in range(n)]))
  if a in [0x40dc70,0x406dd0]:u.reg_write(UC_X86_REG_EAX,0)
  if a in [0x465c40,0x406450]:put(base+0x18,0x200)
  if a==0x466ea0:
   u.reg_write(UC_X86_REG_EAX,response);u.mem_write(base+0x8c,b'\x06');u.mem_write(0x53ba00,struct.pack('<H',replacement)*2500)
u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x491380,0x4913bc,count=20000);u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(1500):
 slot=0;base=0x577f00+slot*256;actor=bytearray(256)
 struct.pack_into('<ii',actor,8,20*1024,25*1024);struct.pack_into('<H',actor,0x90,rng.choice([0,0x4000,0x8000,0xc000]));struct.pack_into('<h',actor,0x1c,rng.choice([0,1]))
 struct.pack_into('<iiiiI',actor,8,20480,25600,200,200,rng.choice([0,0x200,0x100000,0x40000,0x80040000,0x400,0x20000400,0x10000400]));struct.pack_into('<h',actor,0xaa,1);struct.pack_into('<h',actor,0xba,4);actor[0x25]=7;actor[0x29]=1;actor[0x8c]=rng.choice([0,2,7]);actor[0x8d]=50
 struct.pack_into('<h',actor,0xa6,rng.choice([-1,0]));struct.pack_into('<iii',actor,0xdc,20480,25600,500);struct.pack_into('<i',actor,0xec,rng.choice([0,100]));actor[0x2a]=rng.choice([0,10]);
 struct.pack_into('<iiii',actor,0xcc,20000,25000,20,30);actor[0x28]=rng.choice([0,1,2,7,31]);
 actor[0x22]=i%8;actor[0x78]=11 if i%17==0 else 0;actor[0x79]=139 if i%19==0 else 0
 phase=rng.choice([0,192,1,256]);seed=rng.randrange(2**32)
 code=1;flags=rng.choice([0,0x1000,0x1800]);response=rng.choice([0,2]);replacement=rng.choice([0,0x800,0x1800])
 b=bytearray(16);struct.pack_into('<h',b,0,rng.choice([1,2,4]));struct.pack_into('<i',b,8,rng.choice([15,16,20]))
 partner=bytearray(actor);struct.pack_into('<i',partner,8,20500);partner[0x29]=rng.choice([0,1,2]);struct.pack_into('<ii',partner,0xdc,rng.choice([15000,30000]),30000);struct.pack_into('<I',partner,0x18,rng.choice([0,0x400]));owners=[rng.choice([-1,0]) for _ in range(16)]
 global_flags=rng.choice([0,32]);points=[dict(x=100+j*20,y=150+j*30,visible=rng.choice([True,True,False])) for j in range(3)]
 q=dict(swingOverride=0,roundClock=0,holeTees=[dict(x=20,z=25)]*20,updateScratch=0,variant=0,luck=0,worldFlags=global_flags,globalFlags=global_flags,holeTargets=[dict(x=25,z=35)]*3,actorId=slot,actor=list(actor),partner=list(partner),visualOwners=owners,difficulty=-1,focusActor=-1,lastPairClock=0,modeByte=0,detailLevel=4,environmentByte=0,conditionRange=20,metadata=[{}, {'shape':1}],trackedX=-1,trackedZ=-1,trackedFacing=0,phaseCounter=phase,seed=seed,code=code,flags=flags,building=list(b))
 q.update(effectFlagMutation=i%3,queueClock=100,selectionState=-1,clubhouseTile=dict(x=20,z=25),avoidanceCursor=0,fastWalking=0,cartUpgrade=0,type6Available=0,type8Available=0,type10Available=0,serviceTileX=-1,serviceTileZ=0,nearestFacilityDistance=65535);q['metadata'] += [dict(shotClass=struct.unpack('<b',u.mem_read(0x576dc2+j*48,1))[0],walkingCost=struct.unpack('<b',u.mem_read(0x576dc5+j*48,1))[0]) for j in range(2,23)];q['metadata'][1].update(walkingCost=1,shotClass=0,bounceCoefficient=4,rollCoefficient=3,scatterCoefficient=0)
 u.mem_write(0x577f00,bytes(152*256));u.mem_write(0x574500,bytes(20*520));u.mem_write(0x58a708,bytes(4096));u.mem_write(0x567698,bytes(800));u.mem_write(0x53aabc,bytes([2]*2500));u.mem_write(0x576dc2+48,bytes([0]));u.mem_write(0x576dc5+48,bytes([1]));u.mem_write(0x576dc6+48,bytes([0]));put(0x568f6c,100);put(0x5a4440,-1);put(0x5a446c,0);put(0x599a9c,0);put(0x838684,0)
 for j in range(20):u.mem_write(0x574500+j*520,bytes([4]));put(0x574508+j*520,20);put(0x57450c+j*520,25);put(0x574510+j*520,20);put(0x574514+j*520,25)
 u.mem_write(base,bytes(actor));u.mem_write(base+256,bytes(partner));u.mem_write(base+512,bytes(actor));put(0x59d208,global_flags)
 for j in range(3):put(0x574518+j*520,25);put(0x57451c+j*520,35)
 for j,v in enumerate(owners):u.mem_write(0x59e6b0+j*0x388,struct.pack('<h',v))
 for a,v in [(0x820344,-1),(0x4c1dfc,-1),(0x599a98,0),(0x4c183c,4),(0x5842a0,-1),(0x5842a4,-1)]:put(a,v)
 u.mem_write(0x576dc7+48,b'\x01');put(0x5672a0,20);u.mem_write(0x5a1f30,b'\x00');u.mem_write(0x568148,b'\x00');u.mem_write(0x5842b6,b'\x00');put(0x820454,seed);put(0x831828,phase);put(0x102010,slot)
 u.mem_write(0x570d38,bytes([code])*2500);u.mem_write(0x53ba00,struct.pack('<H',flags)*2500);u.mem_write(0x58a708,bytes(b))
 u.mem_write(0x576dc0+48,bytes([4,3,0]));put(0x59a188,0)
 for j in range(32):put(0x5698cc+j*184,0)
 trace=[];moving=False;calls=[];draws=0;sample=None;next_branch=None;point_index=0;turn_seen=False;put(0x102050,0);u.reg_write(UC_X86_REG_FPCW,0x37f);u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,slot*256);u.reg_write(UC_X86_REG_EBX,slot);u.emu_start(0x42819c,0x400fff,count=10000000)
 rows.append(dict(trace=trace,q=q,points=points,response=response,replacement=replacement,expected=dict(actor=list(u.mem_read(base,256)),partner=list(u.mem_read(base+256,256)),visualOwners=[struct.unpack('<h',u.mem_read(0x59e6b0+j*0x388,2))[0] for j in range(16)],focusActor=struct.unpack('<i',u.mem_read(0x4c1dfc,4))[0],trackedX=struct.unpack('<i',u.mem_read(0x5842a0,4))[0],trackedZ=struct.unpack('<i',u.mem_read(0x5842a4,4))[0],trackedFacing=u.mem_read(0x5842b6,1)[0],visualSlot=struct.unpack('<i',u.mem_read(0x102030,4))[0],seed=read(0x820454),flags=struct.unpack('<H',u.mem_read(0x53ba00,2))[0],calls=calls,randomDraws=draws,ballTile=dict(x=struct.unpack('<i',u.mem_read(0x102018,4))[0],z=struct.unpack('<i',u.mem_read(0x102020,4))[0]),ballTerrain=read(0x102014),actorIndex=read(0x10203c),actorTerrain=read(0x10202c),next=next_branch,partnerNotReady=bool(read(0x102034)) if turn_seen else None,closerToCup=bool(read(0x102074)) if turn_seen else None)))
 # Clubhouse coordinates alias hole 19's tee: initialise them through that record.
 rows[-1]['expected'].update(counts=[read(0x5698cc+j*184) for j in range(32)],totals=[struct.unpack('<H',u.mem_read(0x574662+j*520,2))[0] for j in range(20)],globalFlags=read(0x59d208),actors=list(u.mem_read(0x577f00,152*256)),holes=list(u.mem_read(0x574500,20*520)),visitorAssignments=list(u.mem_read(0x567698,800)),avoidanceCursor=read(0x5a446c),selectionState=struct.unpack('<i',u.mem_read(0x5a4440,4))[0])
for row in rows:
 for key in ['ballTile','ballTerrain','actorIndex','actorTerrain','partnerNotReady','closerToCup','visualSlot']:row['expected'].pop(key)
from collections import Counter
print('Native continuation coverage:',dict(Counter(row['expected']['next'] for row in rows)),flush=True)
print('Walking entries:',sum(any(t[0]=='0x428ad1' for t in row['trace']) for row in rows),'planner calls:',sum(any(c['address']==0x4235c0 for c in row['expected']['calls']) for row in rows),'changed actor positions:',sum(row['q']['actor'][8:16]!=row['expected']['actor'][8:16] for row in rows),flush=True)
module=(root/'simgolf-reborn/scene/src/simulation/original-actor-turn.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalActorTurn}=await import(MODULE);for(const r of JSON.parse(readFileSync(0,'utf8'))){const q=r.q,actors=Array.from({length:152},()=>new Uint8Array(256));actors[q.actorId]=Uint8Array.from(q.actor);actors[1]=Uint8Array.from(q.partner);actors[2]=Uint8Array.from(q.actor);const holes=Array.from({length:20},()=>{const b=new Uint8Array(520),v=new DataView(b.buffer);b[0]=4;for(const [o,n] of [[8,20],[12,25],[16,20],[20,25]])v.setInt32(o,n,true);return b;});for(let i=0;i<3;i++){const v=new DataView(holes[i].buffer);v.setInt32(24,25,true);v.setInt32(28,35,true);}let pointIndex=0;const a=originalActorTurn({...q,actors,holes,edgeMasks:new Uint8Array(2500),shotStatCounts:new Uint32Array(32),holeStrokeTotals:new Uint16Array(20),visitorAssignments:new Uint8Array(800),facilityRecords:new Uint8Array(4096),facilityWidths:Array(16).fill(0),traversalCosts:new Int8Array(2500).fill(2),metadataClass:new Uint8Array(128),terrain:new Uint8Array(2500).fill(q.code),tileFlags:new Uint16Array(2500).fill(q.flags),buildings:[Uint8Array.from(q.building)]},(e,s)=>{if(e.address===0x4235c0)new DataView(s.actors[0].buffer).setUint32(0xe8,0x40000000,true);if(e.address===0x40c140&&q.effectFlagMutation){const key=q.effectFlagMutation===1?'globalFlags':'worldFlags';s[key]^=32;}if(e.address===0x425b50)new DataView(s.actors[0].buffer).setInt16(0xaa,2,true);if(e.address===0x466ea0){s.tileFlags.fill(r.replacement);s.actors[0][0x8c]=6;}if([0x465c40,0x406450].includes(e.address))new DataView(s.actors[0].buffer).setUint32(0x18,0x200,true);return {state:s,value:0,point:[0x42f270,0x42f020].includes(e.address)?r.points[pointIndex++]:undefined,result:e.address===0x466ea0?r.response:0};});const actual={counts:Array.from(a.state.shotStatCounts),totals:Array.from(a.state.holeStrokeTotals),globalFlags:a.state.globalFlags,actors:a.state.actors.flatMap(b=>Array.from(b)),holes:a.state.holes.flatMap(b=>Array.from(b)),visitorAssignments:Array.from(a.state.visitorAssignments),avoidanceCursor:a.state.avoidanceCursor,selectionState:a.state.selectionState,actor:Array.from(a.state.actors[0]),partner:Array.from(a.state.actors[1]),visualOwners:a.state.visualOwners,focusActor:a.state.focusActor,trackedX:a.state.trackedX,trackedZ:a.state.trackedZ,trackedFacing:a.state.trackedFacing,visualSlot:a.visualSlot,seed:a.state.seed,flags:a.state.tileFlags[0],calls:a.calls,randomDraws:a.randomDraws,ballTile:a.ballTile,ballTerrain:a.ballTerrain,actorIndex:a.actorIndex,actorTerrain:a.actorTerrain,next:a.next,partnerNotReady:a.partnerNotReady??null,closerToCup:a.closerToCup??null};for(const key of ['ballTile','ballTerrain','actorIndex','actorTerrain','partnerNotReady','closerToCup','visualSlot'])delete actual[key];if(!isDeepStrictEqual(actual,r.expected)){console.error(JSON.stringify({i:q.phaseCounter,next:actual.next,fields:Object.keys(r.expected).filter(k=>!isDeepStrictEqual(actual[k],r.expected[k])),calls:actual.calls,expectedCalls:r.expected.calls,expectedNext:r.expected.next,actorDiff:actual.actor.map((v,i)=>v===r.expected.actor[i]?null:[i,v,r.expected.actor[i]]).filter(Boolean),trace:r.trace}));process.exit(1)};}console.log('1500 continuous native actor walking/shot/motion turns match shared state, actors, holes, RNG and calls.');""".replace('MODULE',json.dumps(module))
result=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True);raise SystemExit(result.returncode)
