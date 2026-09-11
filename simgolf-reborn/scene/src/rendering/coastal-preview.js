import {buyLand} from '../simulation/land-purchase.js';
// Render future parcels using the actual purchase generator, without granting
// ownership, charging funds or changing the saved game.
const cache=new WeakMap();
export function coastalPreview(g){
 if(g.landscapeStyle!=='coast')return g;
 const prior=cache.get(g);if(prior?.revision===g.revision)return prior.view;
 const future={...g,cash:100000,ledger:[],tiles:{...g.tiles},elevation:{...g.elevation}};
 while((future.landParcels||0)<3)buyLand(future);
 const view={...g,tiles:future.tiles,elevation:future.elevation};
 cache.set(g,{revision:g.revision,view});return view;
}
