import {test,expect} from '@playwright/test';
import {createGame,openHole} from '../src/simulation/game.js';
import {center,key} from '../src/simulation/world.js';
function island(g,c,r){
 for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)
  if(dc||dr)g.tiles[key(c+dc,r+dr)]={type:'water'};
}
test('opening distinguishes an isolated tee from an isolated green and accepts bridge access',()=>{
 const g=createGame();
 g.holes[0].tee=center(15,15);g.holes[0].green=center(30,15);
 island(g,30,15);
 expect(openHole(g).message).toContain('The tee is reachable, but the green is not');
 g.bridges={ [key(29,15)]:true };g.revision++;
 expect(openHole(g).ok).toBe(true);
 g.holes[0].open=false;
 island(g,15,15);g.revision++;
 expect(openHole(g).message).toContain('The tee is unreachable from the clubhouse');
 g.bridges[key(14,15)]=true;g.revision++;
 expect(openHole(g).ok).toBe(true);
});
