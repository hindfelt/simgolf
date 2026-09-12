"""Execute original hole naming and custom-name lookup; only CRT conversion is controlled."""
from pathlib import Path
import hashlib,json,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x8000)
for a,n in [(0x407050,0xc0),(0x45b2c0,0x55),(0x4c0000,0x30000)]:u.mem_write(a,p.get_data(a-0x400000,n))
u.mem_write(0x4acb95,b'\xc3');events=[]
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def hook(u,a,size,data):
 if a not in [0x45b2c0,0x4acb95]:return
 sp=u.reg_read(UC_X86_REG_ESP);n=1 if a==0x45b2c0 else 3;args=list(struct.unpack('<'+'i'*n,u.mem_read(sp+4,n*4)));events.append(dict(address=a,args=args))
 if a==0x4acb95:u.mem_write(args[1],str(args[0]).encode()+b'\0');u.reg_write(UC_X86_REG_EAX,args[1])
u.hook_add(UC_HOOK_CODE,hook);rows=[]
for i in range(6400):
 h=i%20;flags=[0,1,2,128,129][(i//20)%5];par=[3,4,5,255][(i//100)%4];offset=[-1,0,12,-12][(i//400)%4];prefix=['','Near ','Before\0ignored','A '][(i//1600)%4]
 current=[0]*520;current[8]=par;following=[0]*520;following[0]=flags
 q=dict(holeIndex=h,holeRecords={str(h):current,str(h+1):following},holeNameOffsets={str(h):offset},holeNameStrings={str(offset):'Custom '+str(h)},state=dict(sourceText=prefix))
 u.mem_write(0x5744f8+h*520,bytes(current));u.mem_write(0x5744f8+(h+1)*520,bytes(following));u.mem_write(0x59c26c+2*h,struct.pack('<h',offset));u.mem_write(0x56e700+offset,('Custom '+str(h)).encode()+b'\0');u.mem_write(0x518f78,prefix.encode()+b'\0')
 put(0x102000,0x401000);put(0x102004,h);u.reg_write(UC_X86_REG_ESP,0x102000);events=[];u.emu_start(0x407050,0x401000,count=3000);assert u.reg_read(UC_X86_REG_EIP)==0x401000
 rows.append([q,dict(state=dict(sourceText=bytes(u.mem_read(0x518f78,512)).split(b'\0')[0].decode('latin1')),events=events)])
module=(root/'simgolf-reborn/scene/src/simulation/original-hole-description.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalHoleDescription} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){for(const id in q.holeRecords)q.holeRecords[id]=Uint8Array.from(q.holeRecords[id]);const got=originalHoleDescription(q);if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native hole-description cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
seen=set();fixture=[]
for row in rows:
 q,out=row;key=(out['state']['sourceText'],tuple(e['address'] for e in out['events']))
 if key not in seen:seen.add(key);fixture.append(row)
(root/'simgolf-reborn/scene/tests/fixtures/original-hole-description.json').write_text(json.dumps(fixture,separators=(',',':'))+'\n')
