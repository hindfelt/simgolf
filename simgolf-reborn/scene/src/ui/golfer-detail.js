import {happinessSummary} from './happiness-summary.js';
import {greenFee, airstripFeeBonus} from '../simulation/happiness.js';

// Present recorded simulation state without inventing causes or rating deltas.
export function golferDetailModel(golfer, lie, connectedAirstrip) {
 const base=greenFee(golfer),bonus=airstripFeeBonus(golfer,connectedAirstrip),fee=base+bonus;
 return {
  name:golfer.name,
  round:`Hole ${golfer.holeNumbers[golfer.holeIndex] ?? '—'} · ${golfer.strokes} strokes · ${lie}`,
  activity:golfer.phase.replaceAll('-', ' '),
  happiness:`${golfer.happiness} / 10`,
  feeLabel:fee<0?'Current refund':'Current green fee',
  fee:`$${Math.abs(fee).toLocaleString('en-US')}`,
  feeExplanation:golfer.pro?'Professionals play without green fees.':`Happiness fee $${base.toLocaleString('en-US')}${bonus?` + airstrip $${bonus}`:''}. Settled after each hole; this amount can change while playing.`,
  needs:`Energy ${Math.round(golfer.energy)} · Hunger ${Math.round(golfer.hunger)} · Thirst ${Math.round(golfer.thirst)}`,
  comment:golfer.comment || '',
  experiences:happinessSummary(golfer),
  training:Object.keys(golfer.trained||{}).filter(k=>golfer.trained[k]).join(', ')||'None',
 };
}

export function renderGolferDetail(target, model) {
 const signature=JSON.stringify(model);
 if(target.dataset.golferDetail===signature)return;
 target.dataset.golferDetail=signature;
 target.tabIndex=0;
 target.setAttribute('aria-label',`${model.name} golfer details`);
 const card=document.createElement('article');card.className='golfer-detail';
 const text=(tag,content,className)=>{const el=document.createElement(tag);el.textContent=content;if(className)el.className=className;return el;};
 const heading=document.createElement('header');heading.append(text('h3',model.name),text('p',model.round));card.append(heading);
 const stats=document.createElement('dl');
 for(const [label,value] of [['Happiness',model.happiness],[model.feeLabel,model.fee],['Activity',model.activity]]){
  const group=document.createElement('div');group.append(text('dt',label),text('dd',value));stats.append(group);
 }
 card.append(stats,text('p',model.feeExplanation,'golfer-fee-note'),text('p',model.needs));
 if(model.comment)card.append(text('blockquote',model.comment));
 card.append(text('p',model.experiences,'golfer-experiences'),text('p',`Training: ${model.training}`));
 target.replaceChildren(card);
}
