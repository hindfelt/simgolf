"""Chain native physical search, caller aim, and final automatic launch."""
from pathlib import Path
source=Path(__file__).with_name('verify-original-full-physical-search.py')
exec(compile(source.read_text().split('\nrows=[]')[0],str(source),'exec'))
with_target_result=True
for a,n in [(0x466ea0,0x22),(0x46c140,0x2c)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_write(0x4672d0,b'\xc3')
byte_fields={'marker':0x577f82,'reaction':0x577f8c,'actorClass':0x577f20,'hole':0x577f29,'shotCounter':0x577f2a,'skillMask':0x577f21,'club':0x577f24,'elevationCounter':0x577f23,'recoveryValue':0x578000}
word_fields={'stateCode':0x577fb4,'profileIndex':0x577fbe,'conditionFlags':0x577f90,'usedClubs':0x577fa8}
def actor_state():
 a={k:u.mem_read(v,1)[0] for k,v in byte_fields.items()}
 a.update({k:struct.unpack('<H',u.mem_read(v,2))[0] for k,v in word_fields.items()})
 a.update(actorFlags=read(0x577f18)&0xffffffff,angularOffset=read(0x577ff4),target=dict(x=read(0x577fd4),z=read(0x577fd8)))
 return a
launching=False;events=[];draws=0;refs={};trace=[]
def launch_hook(u,a,n,d):
 global draws,refs
 if not launching:return
 trace.append(hex(a));del trace[:-24]
 if a==0x425aca:u.emu_stop();return
 if a==0x424988:draws=0
 if a==0x45bab0:draws+=1
 if a==0x425372:
  sp=u.reg_read(UC_X86_REG_ESP);refs=dict(scannedTile=read(sp+0x38),sceneryTile=read(sp+0x48),namedReference=read(sp+0x1c),pathHeading=read(sp+0x44))
 if a==0x4672d0:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(actorId=read(sp+4),kind=read(sp+8),value=read(sp+12)))
u.hook_add(UC_HOOK_CODE,launch_hook)
rows=[]
for q,_ in json.loads((root/'simgolf-reborn/scene/tests/fixtures/original-full-physical-target-search.json').read_text()):
 # Each scenario owns fresh actor/social state; candidate and final launch share it.
 u.mem_write(0x577f00,bytes(512));write(0x577f08,q['origin']['x']);write(0x577f0c,q['origin']['z'])
 write(0x574524+q['hole']*520,0);write(0x5746fc+q['hole']*520,0)
 searched=run(q)
 sp=0x10d000;l=q['launch'];actor=actor_state()
 planning={k:l[k] for k in ['x','z','range','globalFlags','difficulty','accuracySetting','level','activeActor','variant','attitude','abilityFlags','abilityValue','driverValue','ironValue','drawValue','fadeValue','backspinValue','targetFlags','directions','dominantCode','dominantDirection','sampleX','sampleZ']}
 planning.update(plannerArgument=-1,explicitTarget=False,mode=0,curve=searched['result']['curve'],distance=searched['aim']['distance'],heading=searched['aim']['heading'],worldFlags=searched['result']['worldFlags'],driftMode=searched['result']['mode'])
 state=dict(actor=actor,partner=dict(actorClass=0,reaction=0),seed=searched['shared']['seed'],cache=searched['shared']['cache'],speed=read(0x577fec),verticalSpeed=read(0x577ff0),heading=read(0x577fe8)&0xffffffff,
  diagnostics=searched['result']['diagnostics'],holeCounter=0,scannedTile=0,sceneryTile=0,namedReference=0,pathHeading=0,landing=searched['search']['winner']['landing'])
 automatic=dict(actorId=q['actorId'],position=q['origin'],planning=planning,state=state,rollCoefficient=0)
 q['automatic']=automatic
 # Restore the outer caller locals, not golfer/RNG/cache/map state. Those are
 # exactly what real candidate search left behind in this same emulator.
 for off,v in [(0xb20,q['actorId']),(0xb24,0),(0xb28,-1),(0xb30,searched['result']['curve']),(0x30,l['range']),
  (0x34,q['origin']['x']>>10),(0x40,q['origin']['z']>>10),(0x50,(q['origin']['x']>>10)*50+(q['origin']['z']>>10)),
  (0x14,next(c[2] for c in q['cells'] if c[:2]==[q['origin']['x']>>10,q['origin']['z']>>10])),
  (0x3c,l['dominantCode']),(0x4c,l['dominantDirection']),(0x44,l['sampleX']),(0x20,0)]:write(sp+off,v)
 for index,v in enumerate(l['directions']):write(sp+0xd8+index*4,v)
 write(0x4c1fbc,-1);write(0x58dd80,0)
 launching=True;events=[];draws=0
 try:u.emu_start(0x4239cf,0x425aca,count=1000000)
 except Exception:
  print('Launch trace',trace,'EIP',hex(u.reg_read(UC_X86_REG_EIP)),flush=True);raise
 assert u.reg_read(UC_X86_REG_EIP)==0x425aca
 launching=False
 final_actor=actor_state();final_actor['stateCode']=struct.unpack('<h',u.mem_read(0x577fb4,2))[0]
 final_cache=dict(next=read(0x5a8728),entries=[dict(distance=read(0x5a3200+i*4),verticalSpeed=read(0x567278+i*4),speed=read(0x53ec30+i*4)) for i in range(10)])
 final_state={**state,**refs,'actor':final_actor,'seed':read(0x820454)&0xffffffff,'cache':final_cache,'speed':read(0x577fec),'verticalSpeed':read(0x577ff0),'heading':read(0x577fe8)&0xffffffff,
  'diagnostics':read(0x5a5b88)&0xffffffff,'holeCounter':read(0x574524+q['hole']*520),'lie':read(sp+0x14),'landing':dict(x=read(0x5a7270),z=read(0x5a7278))}
 final=dict(state=final_state,events=events,postPreparationDraws=draws,samples=read(sp+0x20) if final_actor['club']!=13 else 0,shotClassOverrides=[dict(code=c,shotClass=u.mem_read(0x576dc2+c*48,1)[0]) for c in [17,20]])
 rows.append([q,dict(searched=searched,launch=final)])
 print('Native search and launch finished',q['scenario'],q['mode'],flush=True)
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {runSearchLaunch}=await import(HELPER);
for(const [q,e] of JSON.parse(readFileSync(0,'utf8'))){const a=runSearchLaunch(q);if(!isDeepStrictEqual(a,e)){
const diffs=[];function walk(a,b,p=''){if(isDeepStrictEqual(a,b))return;if(a&&b&&typeof a==='object'&&typeof b==='object')for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],p+'.'+k);else if(diffs.length<15)diffs.push({p,a,b});}walk(a,e);throw Error(JSON.stringify({scenario:q.scenario,mode:q.mode,diffs}));}}
console.log('Six physical searches and automatic launches match native execution.');
""".replace('HELPER',json.dumps((root/'simgolf-reborn/scene/tests/helpers/original-search-launch.js').as_uri()))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
if '--write-fixture' in sys.argv:(root/'simgolf-reborn/scene/tests/fixtures/original-search-launch.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
