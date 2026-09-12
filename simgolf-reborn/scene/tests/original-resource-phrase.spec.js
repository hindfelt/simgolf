import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalResourcePhrase} from '../src/simulation/original-resource-phrase.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-resource-phrase.json',import.meta.url)));
test('resource parsing and cache writes match original executable',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalResourcePhrase(q,()=>q.lines)).toEqual(expected);expect(q).toEqual(before);}
});
test('cache hits need no resource loader and failed opens preserve invalidated slots',()=>{
 const hit=rows.find(([,out])=>!out.events.length);expect(originalResourcePhrase(hit[0])).toEqual(hit[1]);
 const [q,expected]=rows.find(([q,out])=>q.lines===null&&out.events.length);
 const result=originalResourcePhrase(q,()=>null);expect(result).toEqual(expected);
 expect(result.state.resourceCache[q.state.resourceCacheIndex].section).toBe(-2);
 expect(result.state.resourceCacheIndex).toBe(q.state.resourceCacheIndex);
});
test('200-line limit closes without caching and missing source data stays explicit',()=>{
 const [q,expected]=rows.find(([q])=>q.section===999);
 expect(originalResourcePhrase(q,()=>q.lines)).toEqual(expected);
 expect(expected.events.filter(e=>e.kind==='read')).toHaveLength(201);
 expect(expected.state.resourceCacheIndex).toBe(q.state.resourceCacheIndex);
 expect(()=>originalResourcePhrase(q)).toThrow('loader is unavailable');
 const malformed=rows.find(([q])=>q.section===99&&q.mode===-1&&q.variant===0)[0];
 expect(()=>originalResourcePhrase({...malformed,previousLineBuffer:undefined},()=>malformed.lines)).toThrow('text is unavailable');
});
