"""Native 0x46c140 profile classification through packed planner world readers."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2]
exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_write(0x400000,p.get_memory_mapped_image()[:0x200000]);u.mem_map(0x100000,0x2000)
rng=random.Random(198);rows=[]
for i in range(256):
 actor=bytearray(256);struct.pack_into('<h',actor,0xbe,i%4);struct.pack_into('<h',actor,0xb6,(i+1)%4)
 profiles=[bytearray(rng.randbytes(560)) for _ in range(4)];profiles[i%4][33]=i
 u.mem_write(0x577f00,bytes(actor));u.mem_write(0x4d5040,b''.join(bytes(b) for b in profiles));u.mem_write(0x101000,struct.pack('<II',0x400fff,0));u.reg_write(UC_X86_REG_ESP,0x101000);u.emu_start(0x46c140,0x400fff,count=100)
 rows.append(dict(actor=list(actor),profiles=[list(b) for b in profiles],expected=u.reg_read(UC_X86_REG_EAX)))
script="""import {readFileSync} from 'node:fs';const {originalPlannerWorldRecords}=await import(RECORDS),{originalProfileGroup}=await import(GROUP);for(const q of JSON.parse(readFileSync(0,'utf8'))){const state={actors:[Uint8Array.from(q.actor)],profileRecords:q.profiles.map(b=>Uint8Array.from(b))};if(originalProfileGroup(0,originalPlannerWorldRecords(state))!==q.expected)throw Error('Native packed profile classification mismatch');}console.log('256 native profile classifications match packed world reads.');"""
for key,name in [('RECORDS','original-planner-world-records'),('GROUP','original-profile-group')]:script=script.replace(key,json.dumps((root/f'simgolf-reborn/scene/src/simulation/{name}.js').as_uri()))
result=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True);raise SystemExit(result.returncode)
