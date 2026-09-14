import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {originalCachedResourcePhrase} from '../src/simulation/original-cached-resource-phrase.js';
const rows=JSON.parse(readFileSync(new URL('./fixtures/original-cached-resource-phrase.json',import.meta.url)));
test('original cache lookup and line selection match native execution',()=>{
 for(const [q,expected] of rows){const before=structuredClone(q);expect(originalCachedResourcePhrase(q)).toEqual(expected);expect(q).toEqual(before);}
});
test('cache misses remain explicit rather than returning fabricated resource text',()=>{
 const row=rows.find(([,out])=>out.next==='load'),result=originalCachedResourcePhrase(row[0]);expect(result.state).toEqual(row[0].state);expect(result.next).toBe('load');
 expect(()=>originalCachedResourcePhrase({...row[0],state:{...row[0].state,resourceCache:[]}})).toThrow('eight entries');
});
