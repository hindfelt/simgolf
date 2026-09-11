import {test,expect} from '@playwright/test';
import {originalCandidateAirCollision} from '../src/simulation/original-candidate-air-collision.js';
import {originalRandom} from '../src/simulation/original-rng.js';
const base={position:{x:26112,z:26112},oldTile:{x:25,z:25},speed:2000,heading:0x20000000,flags:0,mode:0,obstructed:true,professional:false,abilityFlags:0,luck:5,seed:2002};
const run=q=>originalCandidateAirCollision({...base,...q});
test('design mode and unobstructed flight preserve RNG state',()=>{
 for(const q of [{mode:2},{obstructed:false}])expect(run(q)).toEqual({speed:2000,heading:base.heading,flags:0,seed:2002,draws:0,hit:false});
});
test('collision consumes chance, direction and speed draws in original order',()=>{
 const rng=originalRandom(2002);expect(rng.next(768)).toBeGreaterThan(0);
 const heading=(base.heading+((64+rng.next(128))<<24))>>>0,speed=2000-rng.next(2000);
 expect(run({})).toEqual({speed,heading,flags:2,seed:rng.state,draws:3,hit:true});
});
test('outside collision radius still consumes chance draw, without changing motion',()=>{
 expect(run({position:{x:27112,z:26112}})).toMatchObject({speed:2000,heading:base.heading,hit:false,draws:1});
});
test('zero and wrapped RNG speed bounds consume the same number of draws',()=>{
 expect(run({speed:0})).toMatchObject({speed:0,draws:3,hit:true});
 expect(run({speed:65536})).toMatchObject({speed:65536,draws:3,hit:true});
});
