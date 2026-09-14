"""Compare full original location descriptions with actual map/object tables."""
from pathlib import Path
import hashlib,json,random,struct,subprocess
import pefile
from unicorn import Uc,UC_ARCH_X86,UC_MODE_32,UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESP,UC_X86_REG_EIP,UC_X86_REG_EAX
root=Path(__file__).resolve().parents[2];exe=root/"resources/sim golf/Sid Meier's SimGolf/golf.exe"
assert hashlib.sha256(exe.read_bytes()).hexdigest()=='82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf'
p=pefile.PE(str(exe));u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(0x400000,0x200000);u.mem_map(0x100000,0x4000)
for a,n in [(0x4074d0,0x458),(0x4c3930,16),(0x4c3c00,0x200)]:
 o=p.get_offset_from_rva(a-0x400000);u.mem_write(a,p.__data__[o:o+n])
u.mem_write(0x407270,b'\xc3')
def put(a,v):u.mem_write(a,struct.pack('<I',v&0xffffffff))
def get(a):return struct.unpack('<i',u.mem_read(a,4))[0]
def text(a,s):u.mem_write(a,s.encode('ascii')+b'\0')
def read(a):return bytes(u.mem_read(a,512)).split(b'\0')[0].decode('ascii')
events=[]
def hook(u,a,size,data):
 if a==0x407270:
  sp=u.reg_read(UC_X86_REG_ESP);events.append(dict(address=a,args=[get(sp+4),get(sp+8)]));text(0x518f78,read(0x518f78)+'Building'+str(get(sp+4)))
u.hook_add(UC_HOOK_CODE,hook)
rows=[]
for i in range(6080):
 detail=(i//5)%256;category=(i//23)%24;terrain=i%23;objects={'7':dict(c=10,r=11,type=0,value=5),str(detail):dict(c=10,r=11,type=[2,4,7][i%3],value=13)}
 cells={'20,21':dict(tile=terrain,detail=detail,flags=[0,32,4096,4128][(i//3)%4]),'10,11':dict(tile=(terrain+5)%23,detail=detail,flags=[0,32,4096,4128][(i//7)%4])}
 q=dict(c=20,r=21,type=[-1,263,terrain][i%3],objects=objects,terrainTypes=[category]*23,environmentCode=(i//11)%5,worldType=[7,10,13][(i//13)%3],cells=cells,state=dict(sourceText='Near '))
 if 6000<=i<6050:
  q['type']=-1;q['terrainTypes']=[4]*23;q['environmentCode']=((i-6000)//5)%5;q['worldType']=7;cells['20,21'].update(tile=4,detail=i%5,flags=4096 if i<6025 else 0)
 if i>=6050:
  q['type']=-1;q['terrainTypes']=[13]*23;q['environmentCode']=1;cells['20,21']['tile']=13
 for key,cell in cells.items():
  c,r=map(int,key.split(','));index=c*50+r;u.mem_write(0x570d38+index,bytes([cell['tile']]));u.mem_write(0x5682dc+index,bytes([cell['detail']]));u.mem_write(0x53ba00+2*index,struct.pack('<H',cell['flags']))
 for j,kind in enumerate(q['terrainTypes']):u.mem_write(0x576dc6+j*48,bytes([kind]))
 for j,item in objects.items():
  a=0x58a708+int(j)*16;u.mem_write(a,struct.pack('<hhh',item['type'],item['c'],item['r']));put(a+8,item['value'])
 put(0x59a9e0,1);u.mem_write(0x570a44+46,bytes([q['worldType']]));u.mem_write(0x5a1f30,bytes([q['environmentCode']]));text(0x518f78,q['state']['sourceText'])
 sp=0x102000;put(sp,0x401000);put(sp+4,q['c']);put(sp+8,q['r']);put(sp+12,q['type']);u.reg_write(UC_X86_REG_ESP,sp);events=[];u.emu_start(0x4074d0,0x401000,count=3000);assert u.reg_read(UC_X86_REG_EIP)==0x401000
 rows.append([q,dict(state=dict(sourceText=read(0x518f78)),events=events,result=u.reg_read(UC_X86_REG_EAX))])
module=(root/'simgolf-reborn/scene/src/simulation/original-location-description.js').as_uri()
script="""import {readFileSync} from 'node:fs';import {isDeepStrictEqual} from 'node:util';import {originalLocationDescription} from MODULE;const rows=JSON.parse(readFileSync(0,'utf8'));for(const [q,expected] of rows){const cell=(c,r)=>q.cells[`${c},${r}`];const got=originalLocationDescription(q,{tileAt:(c,r)=>cell(c,r).tile,flagsAt:(c,r)=>cell(c,r).flags,detailAt:(c,r)=>cell(c,r).detail},(e,s)=>({...s,sourceText:s.sourceText+'Building'+e.args[0]}));if(!isDeepStrictEqual(got,expected))throw Error(JSON.stringify({q,expected,got}));}console.log(`${rows.length} native location-description cases matched`);""".replace('MODULE',json.dumps(module))
subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(rows),text=True,check=True)
# Keep distinct observed output/call branches instead of the first short prefix.
seen=set();fixtures=[]
for row in rows:
 q,out=row;key=(out['state']['sourceText'],q['type']==263,q['type']==-1)
 if key not in seen:seen.add(key);fixtures.append(row)
(root/'simgolf-reborn/scene/tests/fixtures/original-location-description.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
