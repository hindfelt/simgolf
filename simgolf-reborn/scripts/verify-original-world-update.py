"""Compare world callback dispatch and phase update with native 4172ce–41732d.
Callback bodies are controlled state mutations, not verified by this oracle.
"""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP
root=Path(__file__).resolve().parents[2]
exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32)
u.mem_map(0x400000,0x500000);u.mem_write(0x400000,p.get_memory_mapped_image());u.mem_map(0x100000,0x4000)
fields=dict(phaseCounter=0x831828,globalFlags=0x59d208,updateScratch=0x59a188,modeCounter=0x53ce64,seed=0x820454,modeByte=0x568148)
def put(name,value):u.mem_write(fields[name],struct.pack('<B' if name=='modeByte' else '<I',value))
def get(name):return struct.unpack('<B' if name=='modeByte' else '<I',u.mem_read(fields[name],1 if name=='modeByte' else 4))[0]
addresses=[0x428100,0x4029e0,0x409980,0x46df40]
for address in addresses:u.mem_write(address,b'\xc3')
calls=[];changes={}
def hook(u,address,size,data):
 if address==0x418267:u.emu_stop()
 if address in addresses:
  calls.append(address)
  for name,value in changes[address].items():put(name,value)
u.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(2002);rows=[]
for i in range(4096):
 q=dict(phaseCounter=[0,1,2,0xfffffffe,0xffffffff,rng.randrange(2**32)][i%6],globalFlags=i%16,updateScratch=99,modeByte=i%2,modeCounter=(i//2)%2,seed=17)
 changes={a:dict(seed=rng.randrange(2**32)) for a in addresses}
 # Exercise flags and conditional-call gates changing during previous calls.
 if i%3==0:changes[0x409980].update(globalFlags=rng.randrange(16),modeByte=rng.randrange(2),modeCounter=rng.randrange(2))
 if i%5==0:changes[0x46df40].update(phaseCounter=rng.randrange(2**32),globalFlags=rng.randrange(16))
 for name,value in q.items():put(name,value)
 calls=[];u.reg_write(UC_X86_REG_ESP,0x102000);u.emu_start(0x4172ce,0x41732d,count=1000)
 rows.append(dict(q=q,changes=changes,expected=dict(state={name:get(name) for name in fields},calls=calls,skipped=bool(q['globalFlags']&4))))
module=(root/'simgolf-reborn/scene/src/simulation/original-world-update.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';
const {originalWorldUpdate}=await import(MODULE);
for(const row of JSON.parse(readFileSync(0,'utf8'))){const actual=originalWorldUpdate(row.q,(a,s)=>({...s,...row.changes[a]}));if(!isDeepStrictEqual(actual,row.expected))throw Error(JSON.stringify({row,actual}));}
console.log('4096 native world dispatch / phase cases match. Callback bodies remain external.');
""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
