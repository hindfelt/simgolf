export const DAYLIGHT_SECONDS = 480;
export const NIGHT_SECONDS = 10;
export const DAY_SECONDS = DAYLIGHT_SECONDS + NIGHT_SECONDS;
export function clubTime(time) {
  const day = Math.floor(time / DAY_SECONDS) + 1;
  const elapsed = time % DAY_SECONDS;
  return {day, night:elapsed >= DAYLIGHT_SECONDS, progress:Math.min(1,elapsed/DAYLIGHT_SECONDS), remaining:DAY_SECONDS-elapsed};
}
export function initializeClubDay(g) {
  g.clubDay ??= {since:g.time, cursor:g.ledger.length, visitors:0, happiness:0, samples:0, income:0, operating:0, construction:0, visitorSpend:0, reports:[]};
  return g.clubDay;
}
export function recordClubArrival(g) { initializeClubDay(g).visitors++; }
export function collectClubDay(g,dt) {
  const d=initializeClubDay(g);
  for (const row of g.ledger.slice(d.cursor)) {
    if(/green fee$|^Snack bar sale$/.test(row.reason)) d.visitorSpend+=row.amount;
    if(row.amount >= 0) {
      d.income+=row.amount;
    } else if (/^Build |^Buy land parcel /.test(row.reason)) d.construction-=row.amount;
    else d.operating-=row.amount;
  }
  d.cursor=g.ledger.length;
  for(const v of g.guests) if(Number.isFinite(v.happiness)) {
    d.happiness+=v.happiness*dt;d.samples+=dt;
  }
}
export function closeClubDay(g,day) {
  const d=initializeClubDay(g), previous=d.reports.at(-1);
  const report={day,from:d.since,to:g.time,partial:d.since > Math.max(0,(day-1)*DAY_SECONDS-NIGHT_SECONDS),
    income:d.income, operating:d.operating, construction:d.construction,
    net:d.income-d.operating-d.construction, visitors:d.visitors,
    visitorChange:previous ? d.visitors-previous.visitors : null,
    happiness:d.samples ? d.happiness/d.samples : null,
    averageSpend:d.visitors ? d.visitorSpend/d.visitors : null};
  d.reports.push(report);if(d.reports.length>30)d.reports.shift();
  Object.assign(d,{since:g.time,visitors:0,happiness:0,samples:0,income:0,operating:0,construction:0,visitorSpend:0});
}
// Split at sunset/sunrise so reports never depend on client frame size.
export function advanceClubDay(g,dt,step) {
  initializeClubDay(g);
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid simulation step.');
  while(dt>1e-9) {
    const clock=clubTime(g.time), boundary=(clock.day-1)*DAY_SECONDS+(clock.night?DAY_SECONDS:DAYLIGHT_SECONDS);
    const part=Math.min(dt,boundary-g.time);
    step(part);collectClubDay(g,part);dt-=part;
    if(Math.abs(g.time-boundary)<1e-8) {
      g.time=boundary;
      if(!clock.night)closeClubDay(g,clock.day);
    }
  }
}
export function validateClubDay(g) {
  const d=initializeClubDay(g);
  const nonnegative=n=>Number.isFinite(n)&&n>=0;
  if(!nonnegative(d.since)||d.since>g.time||!Number.isSafeInteger(d.cursor)||d.cursor<0||d.cursor>g.ledger.length||
    !['visitors','samples','income','operating','construction'].every(k=>nonnegative(d[k]))||
    !Number.isFinite(d.happiness)||Math.abs(d.happiness)>10*d.samples+1e-7||!Number.isFinite(d.visitorSpend)||
    !Number.isSafeInteger(d.visitors)||!Array.isArray(d.reports)||d.reports.length>30)throw Error('Invalid daily accounts.');
  let last=0;
  for(const r of d.reports) {
    if(!r||!Number.isSafeInteger(r.day)||r.day<=last||!nonnegative(r.from)||!nonnegative(r.to)||r.from>r.to||r.to>g.time||
      typeof r.partial!=='boolean'||!['income','operating','construction','visitors'].every(k=>nonnegative(r[k]))||
      !Number.isSafeInteger(r.visitors)||r.net!==r.income-r.operating-r.construction||
      !(r.happiness===null||(Number.isFinite(r.happiness)&&Math.abs(r.happiness)<=10))||!(r.averageSpend===null||Number.isFinite(r.averageSpend))||
      !(r.visitorChange===null||Number.isSafeInteger(r.visitorChange)))throw Error('Invalid daily report.');
    last=r.day;
  }
}
