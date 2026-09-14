import './golfer-comparison.css';

// Presentation only. Pass cards extracted from an accepted original-world
// result; closing this view never mutates or reruns the simulation.
export function showGolferComparison(host,cards,{onClose=()=>{}}={}){
 if(!Array.isArray(cards)||cards.length!==2||cards.some(c=>typeof c.title!=='string'||!Array.isArray(c.skills)||c.skills.length!==10||c.skills.some(s=>typeof s.label!=='string'||!Number.isFinite(s.percent))))throw Error('Two complete golfer cards are required.');
 const ordered=[...cards].sort((a,b)=>a.x-b.x),dialog=document.createElement('dialog');
 dialog.className='golfer-comparison';dialog.setAttribute('aria-label','Golfer comparison');
 const heading=document.createElement('h2');heading.textContent='Your playing partner';
 const intro=document.createElement('p');intro.textContent='Compare your strengths before the first tee.';
 const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent='Golfer skills';table.append(caption);
 const head=document.createElement('thead'),header=document.createElement('tr');
 for(const text of ['Skill',...ordered.map(c=>c.title.replace(/ vs\.\.\.$/,''))]){const th=document.createElement('th');th.scope='col';th.textContent=text;header.append(th);}head.append(header);table.append(head);
 const body=document.createElement('tbody');
 ordered[0].skills.forEach((skill,i)=>{
  const row=document.createElement('tr'),label=document.createElement('th');label.scope='row';label.textContent=skill.label;row.append(label);
  for(const card of ordered){const td=document.createElement('td'),value=card.skills[i].percent,bar=document.createElement('span'),text=document.createElement('span');bar.className='comparison-bar';bar.setAttribute('aria-hidden','true');bar.style.setProperty('--strength',`${Math.max(0,Math.min(100,value))}%`);text.textContent=`${value}%`;td.append(bar,text);row.append(td);}
  body.append(row);
 });table.append(body);
 const footer=document.createElement('footer'),button=document.createElement('button');button.type='button';button.textContent='Continue to tee';footer.append(button);
 dialog.append(heading,intro,table,footer);host.append(dialog);
 let closed=false;const finish=()=>{if(closed)return;closed=true;dialog.remove();onClose();};
 dialog.addEventListener('close',finish,{once:true});button.addEventListener('click',()=>dialog.close());
 dialog.showModal();button.focus();
 return {close:()=>{if(!closed)dialog.close();},element:dialog};
}
