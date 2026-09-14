import {test,expect} from '@playwright/test';
import {createGame,build,openHole,update,serialize,restore,connected} from '../src/simulation/game.js';
test('a connected airport brings additional visitors and preserves its flight schedule on reload',()=>{
 const g=createGame();expect(build(g,'tee',7,20).ok).toBe(true);expect(build(g,'green',36,5).ok).toBe(true);
 expect(build(g,'airstrip',22,15).ok).toBe(true);for(let c=8;c<=22;c++)build(g,'path',c,11);
 expect(connected(g,g.facilities[0])).toBe(true);expect(openHole(g).ok).toBe(true);
 for(let i=0;i<16000&&!g.guests.some(v=>v.transportExit);i++)update(g,.05);
 const passengers=g.guests.filter(v=>v.transportExit);expect(passengers).toHaveLength(2);
 expect(g.facilities[0].served).toBe(2);expect(g.visitorPool.filter(p=>p.transport==='airstrip')).toHaveLength(2);
 const copy=restore(serialize(g));for(let i=0;i<400;i++){update(g,.05);update(copy,.05);}expect(serialize(copy)).toBe(serialize(g));
});
test('some golfers choose extra range practice after golf without fabricating another golf round',()=>{
 const g=createGame();build(g,'tee',7,20);build(g,'green',20,20);expect(build(g,'driving-range',15,12).ok).toBe(true);
 for(let c=8;c<=12;c++)build(g,'path',c,12);expect(connected(g,g.facilities[0])).toBe(true);openHole(g);
 for(let i=0;i<16000&&!g.guests.some(v=>v.practiceFacilityId&&v.phase==='service');i++)update(g,.05);
 const visitor=g.guests.find(v=>v.practiceFacilityId&&v.phase==='service');expect(visitor).toBeTruthy();expect(visitor.roundFinished).toBe(true);
 const id=visitor.id,rounds=g.rounds.filter(r=>r.golferId===id).length,served=g.facilities[0].served;
 const copy=restore(serialize(g));for(let i=0;i<510;i++){update(g,.05);update(copy,.05);}expect(serialize(copy)).toBe(serialize(g));
 expect(g.facilities[0].served).toBeGreaterThan(served);expect(g.rounds.filter(r=>r.golferId===id)).toHaveLength(rounds);
 expect(visitor.practiceFacilityId).toBeUndefined();
});
