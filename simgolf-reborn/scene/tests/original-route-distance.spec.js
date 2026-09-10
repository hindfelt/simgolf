import {test,expect} from '@playwright/test';
import {originalMapDistance,originalRouteSegment} from '../src/simulation/original-route-distance.js';
import {originalDesignGeometryFromSegments} from '../src/simulation/original-design-geometry.js';
test('map-distance scaling changes only beyond the original strict component boundary',()=>{
 expect(originalMapDistance(3,4)).toBe(5);
 expect(originalMapDistance(16384,16384)).toBe(23170);
 expect(originalMapDistance(16385,0)).toBe(16384);
 expect(originalMapDistance(16385,16385)).toBe(185363);
 expect(originalMapDistance(-16385,-16385)).toBe(185363);
 expect(()=>originalMapDistance(51201,0)).toThrow();
});
test('route units use fixed-point origins and tile centres',()=>{
 expect(originalRouteSegment({x:512,z:512},{x:0,z:0})).toBe(0);
 expect(originalRouteSegment({x:512,z:512},{x:1,z:0})).toBe(25);
 expect(originalRouteSegment({x:512,z:512},{x:3,z:4})).toBe(125);
});
test('actual segment measures feed the dogleg cutoff',()=>{
 const geometry={tee:{x:0,z:0},green:{x:0,z:-20},firstLanding:{x:10,z:-10},teeHeight:5,greenHeight:5};
 const make=tiles=>originalDesignGeometryFromSegments({...geometry,segments:[{origin:{x:512,z:512},targetTile:{x:tiles,z:0}}]});
 expect(make(9).routeMeasure).toBe(225);expect(make(9).flags&0x60).toBe(0);
 expect(make(10).routeMeasure).toBe(250);expect(make(10).flags&0x60).toBe(0x20);
});
