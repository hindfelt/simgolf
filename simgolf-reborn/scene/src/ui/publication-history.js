export function publicationHistory(course,request,practiceButton){
 const details=document.createElement('details'),summary=document.createElement('summary');
 summary.textContent='Published version history';details.append(summary);
 const explanation=document.createElement('p');explanation.textContent='Each publication is a fixed layout. Later edits do not change earlier versions or tournaments already using them.';details.append(explanation);
 const list=document.createElement('div'),notice=document.createElement('p'),more=document.createElement('button');
 notice.setAttribute('role','status');more.textContent='Load version history';details.append(list,notice,more);
 let cursor=null,busy=false,loaded=false;
 async function load(){
  if(busy)return;busy=true;more.disabled=true;notice.textContent='Loading published versions…';
  try{
   const query=new URLSearchParams({courseId:course.courseId});if(cursor)query.set('cursor',cursor);
   const data=await request('/api/published-courses?'+query);
   for(const version of data.courses){
    const row=document.createElement('div'),label=document.createElement('p');
    const date=new Date(version.createdAt).toLocaleString();
    label.textContent=`${version.title} · ${date} · design revision ${version.designRevision} · version ${version.digest.slice(0,8)}${version.id===course.id?' · selected publication':''}`;
    row.append(label,practiceButton(version));list.append(row);
   }
   loaded=true;cursor=data.nextCursor||null;more.hidden=!cursor;more.textContent='Load older versions';
   notice.textContent=list.children.length?`${list.children.length} published versions loaded.`:'No published versions are available.';
  }catch(error){notice.textContent=error.message;more.textContent='Retry version history';more.hidden=false;}
  finally{busy=false;more.disabled=false;}
 }
 more.onclick=load;details.addEventListener('toggle',()=>{if(details.open&&!loaded)void load();});
 return details;
}
