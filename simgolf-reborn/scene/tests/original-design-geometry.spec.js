import {test,expect} from '@playwright/test';
import {originalDesignGeometry} from '../src/simulation/original-design-geometry.js';
const base={tee:{x:0,z:0},green:{x:0,z:-20},firstLanding:{x:10,z:-10},routeMeasure:250,teeHeight:5,greenHeight:5,flags:0};
test('dogleg uses simulated first landing only when original route measure reaches 250',()=>{
 const short=originalDesignGeometry({...base,routeMeasure:249});
 expect(short.bend).toEqual(base.tee);expect(short.flags&0x60).toBe(0);
 expect(short.teeFacing).toBe(1); // Facing is calculated before replacing the bend.
 const long=originalDesignGeometry(base);expect(long.bend).toEqual(base.firstLanding);expect(long.flags&0x60).toBe(0x20);
 expect(originalDesignGeometry({...base,firstLanding:base.green}).flags&0x60).toBe(0);
});
test('elevation requires more than one original level and recalculation removes stale flags',()=>{
 const flags=0x80003060;
 expect([3,4,5,6,7].map(greenHeight=>originalDesignGeometry({...base,greenHeight,flags}).flags&0x3000)).toEqual([0x2000,0,0,0,0x1000]);
 expect(originalDesignGeometry({...base,flags}).flags).toBe(0x80000020);
});
test('tee facing rounds original headings to eight directions without mutating points',()=>{
 const points=[[0,-10],[10,-10],[10,0],[10,10],[0,10],[-10,10],[-10,0],[-10,-10]];
 expect(points.map(([x,z])=>originalDesignGeometry({...base,firstLanding:{x,z}}).teeFacing)).toEqual([0,1,2,3,4,5,6,7]);
 const result=originalDesignGeometry(base);result.bend.x=99;expect(base.firstLanding.x).toBe(10);
 expect(()=>originalDesignGeometry({...base,routeMeasure:NaN})).toThrow();
});
