"""Compare the post-remark completion reset with original x86 instructions."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EBP,UC_X86_REG_EBX
root=Path(__file__).resolve().parents[2]
exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x830000,0x2000)
u.mem_write(0x426e88,p.get_data(0x26e88,0xa8));rows=[]
for i in range(128):
 aid=i%4;hole=i%19;profile=i%3;actor=bytearray((j*31+i)%256 for j in range(256));actor[0x21]=hole
 struct.pack_into('<h',actor,0xb6,profile)
 previous=[-2147483648,-1,0,1,2147483647][i%5];clock=[-2147483648,-1,0,1,2147483647][(i//5)%5]
 struct.pack_into('<i',actor,0xc0,previous)
 h=bytearray(520);struct.pack_into('<i',h,0x1f4,2147483647-i)
 pr=bytearray((j+i)%256 for j in range(44));markers=bytearray((j*13+i)%256 for j in range(64*76))
 for j in range(64):markers[j*76+1]=j%5
 s=dict(actors={str(aid):list(actor)},holeRecords={str(hole):list(h)},completionProfiles={str(profile):list(pr)},completionMarkers=list(markers))
 q=dict(actorId=aid,clock=clock,state=s)
 u.mem_write(0x577f08+aid*256,bytes(actor));u.mem_write(0x5744f8+hole*520,bytes(h));u.mem_write(0x583432+profile*44,bytes(pr));u.mem_write(0x5842b2,bytes(markers));u.mem_write(0x831828,struct.pack('<i',clock))
 u.reg_write(UC_X86_REG_EBP,aid*256);u.reg_write(UC_X86_REG_EBX,aid);u.emu_start(0x426e88,0x426f30,count=3000)
 out=dict(state=dict(actors={str(aid):list(u.mem_read(0x577f08+aid*256,256))},holeRecords={str(hole):list(u.mem_read(0x5744f8+hole*520,520))},completionProfiles={str(profile):list(u.mem_read(0x583432+profile*44,44))},completionMarkers=list(u.mem_read(0x5842b2,64*76))))
 rows.append([q,out])
fixture=root/'simgolf-reborn/scene/tests/fixtures/original-hole-completion-reset.json';fixture.write_text(json.dumps(rows))
js="""import fs from 'node:fs';import assert from 'node:assert/strict';import {originalHoleCompletionReset} from './src/simulation/original-hole-completion-reset.js';const rows=JSON.parse(fs.readFileSync('./tests/fixtures/original-hole-completion-reset.json'));for(const [q,out] of rows){for(const s of [q.state,out.state]){for(const key of ['actors','holeRecords','completionProfiles'])for(const id in s[key])s[key][id]=Uint8Array.from(s[key][id]);s.completionMarkers=Uint8Array.from(s.completionMarkers);}assert.deepEqual(originalHoleCompletionReset(q),out);}console.log(rows.length+' native completion resets matched');"""
subprocess.run(['node','--input-type=module','-e',js],cwd=root/'simgolf-reborn/scene',check=True)
