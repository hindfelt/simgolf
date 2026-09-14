"""Exhaustively compare the original voice bit lookup for signed profile indices."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
o=p.get_offset_from_rva(0x46c140-0x400000);u.mem_write(0x46c140,p.__data__[o:o+0x2c]);rows=[]
for profile in (-1,0,1):
 for byte in range(256):
  u.mem_write(0x102000,struct.pack('<II',0x401000,0));u.mem_write(0x577fbe,struct.pack('<h',profile));u.mem_write(0x4d5061+profile*560,bytes([byte]));u.reg_write(UC_X86_REG_ESP,0x102000)
  u.emu_start(0x46c140,0x401000,count=40);assert u.reg_read(UC_X86_REG_EIP)==0x401000
  rows.append([profile,byte,u.reg_read(UC_X86_REG_EAX)])
module=(root/'simgolf-reborn/scene/src/simulation/original-voice-variant.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {originalVoiceVariant} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [profile,byte,expected] of rows){const actor=new Uint8Array(256);new DataView(actor.buffer).setInt16(0xb6,profile,true);if(originalVoiceVariant(actor,{[profile]:byte})!==expected)throw Error(`${profile}/${byte}`);}console.log(`${rows.length} native voice-query cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
(root/'simgolf-reborn/scene/tests/fixtures/original-voice-variant.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
