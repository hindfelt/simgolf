import {test,expect} from '@playwright/test';
import {createGame,serialize,restore} from '../src/simulation/game.js';
import {buyLand} from '../src/simulation/land-purchase.js';
import {coastalPreview} from '../src/rendering/coastal-preview.js';
import {compatibleGolfRuleset,PRE_ISLAND_RULESET,RULESET_VERSION,PROTOCOL_VERSION} from '../src/simulation/protocol.js';
for(const seed of [1,2002,1356996279])test(`island ${seed} saves and purchases the previewed outer islands`,()=>{
 const g=createGame(seed,'island','tropical'),before=serialize(g),preview=coastalPreview(g);
 expect(serialize(g)).toBe(before);
 expect(Object.values(g.tiles).filter(t=>t.type==='tree').length).toBeGreaterThan(10);
 expect(Object.values(g.tiles).filter(t=>t.type==='water').length).toBeGreaterThan(400);
 g.cash=100000;g.ledger.push({id:1,time:0,amount:50000,reason:"Test funding"});while((g.landParcels||0)<3)expect(buyLand(g).ok).toBe(true);
 expect(g.tiles).toEqual(preview.tiles);expect(g.elevation).toEqual(preview.elevation);
 const saved=restore(serialize(g));expect(saved.tiles).toEqual(g.tiles);expect(saved.landscapeStyle).toBe('island');
});
test('previous saves migrate without changing their coast while new island replays are versioned',()=>{
 const g=createGame(2002,'coast','tropical');g.protocol={version:85,ruleset:PRE_ISLAND_RULESET,tick:0,revision:0,clients:[]};
 const before=structuredClone(g.tiles),saved=restore(serialize(g));expect(saved.protocol.version).toBe(PROTOCOL_VERSION);expect(saved.tiles).toEqual(before);expect(saved.landscapeStyle).toBe('coast');
 expect(compatibleGolfRuleset(PRE_ISLAND_RULESET,'tropical','coast')).toBe(true);
 expect(compatibleGolfRuleset(PRE_ISLAND_RULESET,'tropical','island')).toBe(false);
 expect(compatibleGolfRuleset(RULESET_VERSION,'tropical','island')).toBe(true);
});
