// golf.exe 0x46c140–0x46c16b: complement of profile byte +0x21 bit 7.
export function originalVoiceVariant(actor,profileVoiceBytes){
 if(!(actor instanceof Uint8Array)||actor.length!==256)throw Error('Expected packed original actor.');
 const index=new DataView(actor.buffer,actor.byteOffset,actor.byteLength).getInt16(0xb6,true);
 const byte=profileVoiceBytes?.[index];
 if(!Number.isInteger(byte)||byte<0||byte>255)throw Error(`Missing original voice byte for profile ${index}.`);
 return ((~byte)>>>7)&1;
}
