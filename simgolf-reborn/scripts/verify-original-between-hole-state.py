"""Continuous x86 between-hole record updates; real sign helper retained."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EBP
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x500000);u.mem_write(0x400000,pefile.PE(str(exe)).get_memory_mapped_image());u.mem_map(0x100000,0x4000)
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def hook(u,a,size,data):
 if a in [0x4280a3,0x4280e3]:u.emu_stop()
u.hook_add(UC_HOOK_CODE,hook);rng=random.Random(9212);rows=[]
for i in range(2000):
 id=rng.choice([0,1,127,151]);base=0x577f00+id*256;b=bytearray(rng.randbytes(256));b[0x29]=rng.randrange(1,20);struct.pack_into('<h',b,0xbe,0)
 record=rng.randbytes(44);difficulty=rng.choice([-1,0,1,2,3,127,2147483647]);setting=rng.choice([-2,-1,0,1,20,32767,2147483647]);q=dict(actorId=id,actor=list(b),record=list(record),difficulty=difficulty,adjustmentSetting=setting)
 u.mem_write(base,bytes(b));u.mem_write(0x583432,record);put(0x820344,difficulty);put(0x542be4,setting)
 u.reg_write(UC_X86_REG_ESP,0x102000);u.reg_write(UC_X86_REG_EBP,id*256);u.emu_start(0x427fb0,0x400fff,count=1000)
 rows.append(dict(q=q,expected=list(u.mem_read(base,256))))
module=(root/'simgolf-reborn/scene/src/simulation/original-between-hole-state.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';const {originalBetweenHoleState}=await import(MODULE);for(const [i,r] of JSON.parse(readFileSync(0,'utf8')).entries()){const q=r.q,actors=[];actors[q.actorId]=Uint8Array.from(q.actor);const a=originalBetweenHoleState({...q,actors,completionRecords:[Uint8Array.from(q.record)]});const actual=Array.from(a.state.actors[q.actorId]);if(!isDeepStrictEqual(actual,r.expected))throw Error(JSON.stringify({i,q,expected:r.expected,actual}));}console.log('2000 continuous native between-hole updates match.');""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
