import {test,expect} from '@playwright/test';
import {originalSgaFromRecords} from '../src/simulation/original-sga-records.js';
function fixture() {
 const records=Array.from({length:18},()=>new Uint8Array(520));
 for (const record of records) {
  const v=new DataView(record.buffer);v.setInt8(0,4);v.setInt16(4,400,true);
  v.setInt32(0x20,8,true);v.setInt32(0x1ec,8*40*12,true);v.setInt16(0x158,12,true);
  v.setInt16(0xee,8,true);v.setInt16(0x28+7*22+2,8,true);
 }
 return {records,holeCount:18,facilityMask:0xffc0,difficulty:1,combineContrasts:false};
}
test('original binary records compose all ten SGA criteria',()=>{
 const r=originalSgaFromRecords(fixture());
 expect(r.measurements).toEqual({holes:18,length:7200,minutes:216,funPercent:100,scenic:18,variety:18,lengthHoles:18,accuracyHoles:18,imaginationHoles:18,facilities:10});
 expect(r.report.score).toBe(100);expect(r.report.recommendation).toBe('Grand Slam Championship!');
});
test('time and fun truncate per hole before aggregation; inactive records are skipped',()=>{
 const a=fixture();for (const r of a.records.slice(2))r[0]=0;
 a.holeCount=2;
 const v=new DataView(a.records[0].buffer);
 v.setInt32(0x1ec,8*40*12-1,true);v.setInt32(0x24,3,true);
 const r=originalSgaFromRecords(a);
 expect(r.measurements.minutes).toBe(23);
 expect(r.holes[0].funPercent).toBe(92);expect(r.measurements.funPercent).toBe(96);
 expect(r.measurements.length).toBe(800);expect(r.holes).toHaveLength(2);
});
test('scenery halves its middle contribution, variety is strict and facilities count distinct bits',()=>{
 const a=fixture();const v=new DataView(a.records[0].buffer);
 v.setInt16(0xee,4,true);v.setInt16(0x104,7,true);v.setInt32(0x1fc,2,true);
 a.facilityMask=(1<<5)|(1<<6)|(1<<19)|(1<<20);
 const r=originalSgaFromRecords(a);
 expect(r.measurements.scenic).toBe(17);expect(r.measurements.variety).toBe(17);expect(r.measurements.facilities).toBe(2);
 expect(r.report.score).toBe(0);expect(r.report.unacceptable).toContain('facilities');
 v.setInt16(0x110,1,true);expect(originalSgaFromRecords(a).measurements.scenic).toBe(18);
});
test('empty or malformed records cannot earn a recommendation',()=>{
 const a=fixture();for(const r of a.records)r[0]=0;
 expect(()=>originalSgaFromRecords(a)).toThrow();
 expect(()=>originalSgaFromRecords({...fixture(),records:[]})).toThrow();
});

test('fresh classifications recalculate variety instead of trusting stored penalties',()=>{
 const a=fixture();
 expect(originalSgaFromRecords(a).measurements.variety).toBe(18);
 const report=originalSgaFromRecords({...a,classifications:Array(18).fill(7)});
 expect(report.measurements.variety).toBe(1);
 expect(report.holes[0].varietyPenalty).toBe(0);
 expect(report.holes[1].varietyPenalty).toBe(4);
 expect(report.report.unacceptable).toContain('variety');
 expect(()=>originalSgaFromRecords({...a,classifications:[7]})).toThrow();
});
