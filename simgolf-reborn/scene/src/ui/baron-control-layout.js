let placementOpen, landOpen;
export function arrangeBaronControls(panel) {
 if(!document.documentElement.classList.contains('baron-ui'))return;
 const settings=panel.querySelector('.construction-settings');
 if(!settings)return;
 const wide=matchMedia('(min-width: 900px)').matches;
 const group=(label,ids,open,onToggle)=>{
  const details=document.createElement('details');details.className='baron-control-group';details.open=open;
  const summary=document.createElement('summary');summary.textContent=label;
  const content=document.createElement('div');content.className='baron-group-content';
  for(const id of ids){const node=settings.querySelector('#'+id);if(node)content.append(node.closest('label')||node);}
  details.append(summary,content);details.addEventListener('toggle',()=>onToggle(details.open));return details;
 };
 const placement=group('Brush & direction',['brush','building-rotation'],placementOpen??wide,v=>placementOpen=v);
 const land=group('Land & boundaries',['buy-land','land-status','boundary-outline','finish-boundary','cancel-boundary'],landOpen??false,v=>landOpen=v);
 settings.replaceChildren(placement,land);
}

export function arrangeBaronNewGame() {
 if(!document.documentElement.classList.contains('baron-ui'))return;
 const dialog=document.querySelector('#new-dialog'),footer=document.createElement('div');
 footer.className='baron-dialog-actions';
 for(const id of ['restore-previous','cancel-new','confirm-new'])footer.append(dialog.querySelector('#'+id));
 const layout=document.createElement('div');layout.className='new-game-layout';
 const settings=document.createElement('section');settings.className='new-game-settings';
 const preview=document.createElement('section');preview.className='new-game-map';
 for(const id of ['new-environment','environment-summary','new-landscape','new-seed','reroll-landscape']){const node=dialog.querySelector('#'+id);settings.append(node.closest('label')||node);}
 for(const id of ['landscape-preview','landscape-summary'])preview.append(dialog.querySelector('#'+id));
 layout.append(settings,preview);
 dialog.querySelector('h2').textContent='Create your next great course';
 const paragraphs=dialog.querySelectorAll(':scope > p');
 paragraphs[0].textContent='Choose your setting. Find a landscape worth building on.';
 paragraphs[1].textContent='Start with $50,000 and a fresh career. Your current course is backed up in this browser.';
 paragraphs[1].className='new-game-note';
 dialog.insertBefore(layout,paragraphs[1]);dialog.append(footer);
}
