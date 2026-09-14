export function testingStorage(storage,enabled){
 const key=name=>enabled?`simgolf-reborn.testing.${name}`:name;
 return {getItem:name=>storage.getItem(key(name)),setItem:(name,value)=>storage.setItem(key(name),value),removeItem:name=>storage.removeItem(key(name))};
}
export function testingHref(href,enabled){
 if(!enabled)return href;
 const url=new URL(href,location.href);
 if(url.origin===location.origin)url.searchParams.set('testing','1');
 return url.href;
}
export function mountTestingFeedback({getSave,storage,startScenario}){
 const button=document.createElement('button');button.id='testing-feedback';button.textContent='Test & feedback';
 document.querySelector('.top-actions').append(button);
 const dialog=document.createElement('dialog');dialog.id='testing-feedback-dialog';
 dialog.innerHTML=`<form method="dialog"><button class="close" aria-label="Close testing panel">×</button></form>
 <h2>Playtesting course</h2><p>This is a separate copy of your resort. Changes here are saved only in the testing area.</p>
 <p><strong>Current preview simulation.</strong> The recovered original engine is still being integrated.</p>
 <details><summary>Start a prepared simulation</summary><p>Two open holes and a connected helipad, with an early helicopter visit. This replaces only the testing copy; its previous save is backed up.</p><button id="testing-scenario">Start two-hole simulation</button></details>
 <details><summary>Things to try</summary><ol><li>Build and open a second hole; watch golfers finish both.</li><li>Raise tree-covered land, remove trees and connect a bridge.</li><li>Buy land, including a purchase you cannot afford.</li><li>Play shots near trees, water and white boundary stakes.</li><li>Connect facilities, hire staff and watch dandelion maintenance.</li><li>Save, reload and continue your round.</li></ol></details>
 <label>What were you testing?<select id="testing-topic"><option>Shots and golfer decisions</option><option>Course building and land</option><option>Facilities and staff</option><option>Career and tournaments</option><option>Graphics and controls</option><option>Saving or performance</option></select></label>
 <label>What happened?<textarea id="testing-observed" rows="3" placeholder="Describe what you did and what went wrong (or worked well)."></textarea></label>
 <label>What should happen?<textarea id="testing-expected" rows="2"></textarea></label>
 <button id="testing-export">Download feedback + course</button><p id="testing-status" role="status"></p>
 <p>The file stays on your device. Send it here with your feedback so I can reproduce the situation.</p>
 <a href="./" id="testing-return">Return to normal resort</a>`;
 document.body.append(dialog);
 const observed=dialog.querySelector('#testing-observed'),expected=dialog.querySelector('#testing-expected');
 try{const draft=JSON.parse(storage.getItem('feedback-draft')||'{}');observed.value=draft.observed||'';expected.value=draft.expected||'';}catch{}
 const draft=()=>{try{storage.setItem('feedback-draft',JSON.stringify({observed:observed.value,expected:expected.value}));}catch{}};
 observed.addEventListener('input',draft);expected.addEventListener('input',draft);
 button.onclick=()=>dialog.showModal();
 dialog.querySelector('#testing-scenario').onclick=async()=>{
  const trigger=dialog.querySelector('#testing-scenario');trigger.disabled=true;
  try{await startScenario();}catch(error){dialog.querySelector('#testing-status').textContent=`Could not start simulation: ${error.message}`;trigger.disabled=false;}
 };
 dialog.querySelector('#testing-export').onclick=()=>{
  try{
   const report={format:'simgolf-playtest-feedback',version:1,createdAt:new Date().toISOString(),
    simulation:'current-preview',topic:dialog.querySelector('#testing-topic').value,
    observed:observed.value,expected:expected.value,viewport:{width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio},
    browser:navigator.userAgent,save:JSON.parse(getSave())};
   const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='simgolf-playtest-feedback.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   dialog.querySelector('#testing-status').textContent='Feedback file downloaded with the current course state.';
  }catch(error){dialog.querySelector('#testing-status').textContent=`Could not export feedback: ${error.message}`;}
 };
}
