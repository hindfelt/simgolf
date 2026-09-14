import {originalRoundScoreList} from './original-round-score-list.js';
import {originalRecordAnnouncement} from './original-record-announcement.js';

export function originalRoundResultPrelude(snapshot,resolve){
 const list=originalRoundScoreList(snapshot,resolve);
 if(list.next!=='0x427bd4')return list;
 const announcement=originalRecordAnnouncement({...list.state,totals:list.totals},resolve);
 return {...announcement,rank:list.rank,calls:[...list.calls,...announcement.calls]};
}
