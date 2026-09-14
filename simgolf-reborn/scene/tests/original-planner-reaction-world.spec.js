import {test,expect} from '@playwright/test';
import {originalPlannerActor} from '../src/simulation/original-planner-actor.js';
import {originalPlannerReactionWorld,originalPlannerAfterReaction} from '../src/simulation/original-planner-reaction-world.js';
function fresh(){const world={actorId:0,actors:[new Uint8Array(256),new Uint8Array(256)],holes:Array.from({length:20},()=>new Uint8Array(520)),terrain:Uint8Array.from([1,2,3]),cashTotal:300};world.actors[0][0x29]=1;new DataView(world.actors[0].buffer).setInt16(0xaa,1,true);return world;}
function partial(world){return {actor:originalPlannerActor(world),partner:{actorClass:0,reaction:0},seed:17,diagnostics:2,holeCounter:7,speed:100,heading:0x40000000,verticalSpeed:0,cache:{next:0,entries:[]},sceneryTile:123};}
test('publishing planner state preserves unrelated world records and local references',()=>{
 const world=fresh(),before=structuredClone(world),p=partial(world);p.actor.marker=8;p.partner.reaction=3;
 const written=originalPlannerReactionWorld(world,p,0,1);expect(written.actors[0][0x82]).toBe(8);expect(written.actors[1][0x8c]).toBe(3);expect(written.cashTotal).toBe(300);expect(written.terrain).toEqual(world.terrain);expect(world).toEqual(before);
 expect(originalPlannerAfterReaction(p,written,0,1)).toEqual(p);
});
test('reaction reread retains changed actors, RNG and original planning-hole counter',()=>{
 const world=fresh(),p=partial(world),written=originalPlannerReactionWorld(world,p,0,1);
 written.actors[0][0x29]=2;written.actors[0][0x82]=9;written.actors[1][0x8c]=4;written.seed=99;
 new DataView(written.holes[1].buffer).setInt32(0x24,11,true);new DataView(written.holes[2].buffer).setInt32(0x24,88,true);
 const r=originalPlannerAfterReaction(p,written,0,1);expect(r.actor.hole).toBe(2);expect(r.actor.marker).toBe(9);expect(r.partner.reaction).toBe(4);expect(r.seed).toBe(99);expect(r.holeCounter).toBe(11);expect(r.sceneryTile).toBe(123);
});
