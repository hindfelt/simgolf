import {DurableObject} from 'cloudflare:workers';
import {tournamentRound} from './tournament-rounds.js';
export class TournamentRoundHost extends DurableObject {
 async read(eventId,playerId,round){return this.#request(eventId,playerId,round);}
 async command(eventId,playerId,round,command){return this.#request(eventId,playerId,round,command);}
 async #request(eventId,playerId,round,command){
  try{
   const key=`${eventId}:${playerId}:${round}`;
   const accepted=await this.ctx.storage.transaction(async storage=>{const current=await storage.get('round');if(current!==undefined)return current===key;await storage.put('round',key);return true;});
   if(!accepted)return {ok:false,status:400,error:'Tournament round host mismatch.'};
   return {ok:true,value:await tournamentRound(this.env.DB,eventId,playerId,round,command)};
  }catch(error){const status=Number.isInteger(error.status)&&error.status>=400&&error.status<500?error.status:503;return {ok:false,status,error:status===503?'The tournament round is temporarily unavailable. Retry the same action.':error.message};}
 }
}
