// Describe recorded experiences, not a reconstructed balance: complaints at
// zero happiness are clamped and old saves do not retain the starting balance.
const experiences = {
 'great-shot': ['Enjoyed', 'good approaches'],
 flowers: ['Enjoyed', 'flowerbeds'],
 'club-pro-welcome': ['Enjoyed', 'club professional welcome'],
 'celebrity-welcome': ['Enjoyed', 'celebrity welcome'],
 vendor: ['Enjoyed', 'refreshments'],
 consultant: ['Enjoyed', 'attentive service'],
 tired: ['Disliked', 'fatigue'],
 crabgrass: ['Disliked', 'crabgrass'],
 weed: ['Disliked', 'dandelions'],
 'steep-path': ['Disliked', 'steep uphill paths'],
 wait: ['Disliked', 'tee queues'],
 penalty: ['Disliked', 'penalty shots'],
 angry: ['Disliked', 'nearby angry golfers'],
};
const services={bench:'resting on benches',snack:'snack bar','driving-range':'driving practice','putting-green':'putting practice'};
export function happinessSummary(golfer) {
 const groups={Enjoyed:new Map(),Disliked:new Map()};
 for(const key of new Set(golfer.happinessReactions || [])) {
  const [kind,service]=key.split(':');
  const entry=kind==='service' ? ['Enjoyed',services[service] || 'training facilities'] : experiences[kind];
  if(!entry)continue;
  const [group,label]=entry;
  groups[group].set(label,(groups[group].get(label)||0)+1);
 }
 const lines=Object.entries(groups).filter(([,items])=>items.size).map(([group,items])=>
  `${group}: ${[...items].map(([label,count])=>label+(count>1?` (${count})`:'')).join(', ')}.`);
 return lines.length ? `This visit — ${lines.join(' ')}` : 'No happiness reactions recorded this visit yet.';
}
