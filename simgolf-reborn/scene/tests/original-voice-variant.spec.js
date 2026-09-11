import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalVoiceVariant} from '../src/simulation/original-voice-variant.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-voice-variant.json',import.meta.url)));
test('all voice bytes and signed profile indices match the original read-only helper',()=>{
 for(const [profile,byte,expected] of rows){
  const backing=new Uint8Array(280),actor=backing.subarray(12,268);new DataView(actor.buffer,actor.byteOffset,actor.byteLength).setInt16(0xb6,profile,true);
  const before=backing.slice();expect(originalVoiceVariant(actor,{[profile]:byte})).toBe(expected);expect(backing).toEqual(before);
 }
});
test('missing voice metadata is rejected rather than replaced by a guessed profile',()=>{
 expect(()=>originalVoiceVariant(new Uint8Array(256),{})).toThrow('Missing original voice byte');
 expect(()=>originalVoiceVariant(new Uint8Array(255),{})).toThrow('Expected packed');
});
