import {clubTime} from '../simulation/club-day.js';
const dollars=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export function mountClubDay() {
  const clock=document.createElement('button');clock.id='club-clock';clock.title='View daily reports';document.body.append(clock);
  const night=document.createElement('aside');night.id='night-report';night.setAttribute('aria-label','Daily club report');night.hidden=true;document.body.append(night);
  const history=document.createElement('dialog');history.id='daily-history';document.body.append(history);
  let current, dismissed=null, shown=null;
  const content=r=>!r?'<p>Your first report arrives at sundown.</p>':`<h2>Day ${r.day} · Club accounts</h2>${r.partial?'<p>Partial day since this save was opened.</p>':''}<dl>
    <div><dt>Income</dt><dd>${dollars(r.income)}</dd></div><div><dt>Operating costs</dt><dd>${dollars(r.operating)}</dd></div>
    <div><dt>Construction & land</dt><dd>${dollars(r.construction)}</dd></div><div><dt>Net cash change</dt><dd>${dollars(r.net)}</dd></div>
    <div><dt>Visitor arrivals</dt><dd>${r.visitors}${r.visitorChange===null?'':` (${r.visitorChange>=0?'+':''}${r.visitorChange} vs yesterday)`}</dd></div>
    <div><dt>Golfer happiness</dt><dd>${r.happiness===null?'No golfers':r.happiness.toFixed(1)+' / 10'}</dd></div>
    <div><dt>Golf & snack spend / arrival</dt><dd>${r.averageSpend===null?'—':dollars(r.averageSpend)}</dd></div></dl>`;
  clock.addEventListener('click',()=>{
    const reports=current?.clubDay?.reports||[];
    history.innerHTML='<h1>Daily reports</h1>'+ (reports.length?[...reports].reverse().map(content).join(''):content(null))+'<form method="dialog"><button>Back to the course</button></form>';
    history.showModal();
  });
  return {update(g){
    current=g;const t=clubTime(g.time),report=g.clubDay?.reports.at(-1);
    const minutes=Math.floor(6*60+t.progress*14*60);
    clock.textContent=`Day ${t.day} · ${t.night?'Night':`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`}`;
    night.hidden=!t.night||!report||dismissed===report.day;
    if(!night.hidden){
      if(shown!==report.day){night.innerHTML=content(report)+'<footer><span data-countdown></span><button type="button">Close report</button></footer>';night.querySelector('button').onclick=()=>{dismissed=report.day;night.hidden=true;};shown=report.day;}
      night.querySelector('[data-countdown]').textContent=`Sunrise in ${Math.ceil(t.remaining)}s`;
    }
    return t;
  }};
}
