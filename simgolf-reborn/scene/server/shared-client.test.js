import {expect,test,vi} from 'vitest';
import {createSharedClient} from '../src/shared-client.js';
const snapshot=()=>({id:'course',role:'editor',revision:0,pendingTicks:0,state:{protocol:{revision:0,clients:[]}}});
function client(request){const onSnapshot=vi.fn(),onResult=vi.fn(),onStatus=vi.fn();return {onSnapshot,onResult,onStatus,connection:createSharedClient({snapshot:snapshot(),actorId:'player',request,onSnapshot,onResult,onStatus})};}
test('lost response retries the identical command without optimistic simulation',async()=>{
 let rejectFirst;const request=vi.fn().mockImplementationOnce(()=>new Promise((_resolve,reject)=>{rejectFirst=reject;}));
 const c=client(request),command=c.connection.nextCommand('player','add-hole');
 expect(c.connection.execute(command).pending).toBe(true);expect(c.onSnapshot).not.toHaveBeenCalled();
 rejectFirst(Error('Network lost'));await vi.waitFor(()=>expect(c.onStatus).toHaveBeenCalled());
 request.mockResolvedValueOnce({course:{...snapshot(),revision:1},result:{ok:true,holeId:'hole-2'}});
 await c.connection.synchronize();expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);expect(c.onResult).toHaveBeenCalledTimes(1);expect(c.onSnapshot).toHaveBeenCalledTimes(1);
});
test('catch-up responses retain the pending command until the server accepts it',async()=>{
 const request=vi.fn().mockResolvedValueOnce({course:{...snapshot(),revision:1,pendingTicks:120},result:{ok:false,code:'catching-up'}}).mockResolvedValueOnce({course:{...snapshot(),revision:2},result:{ok:true}});
 const c=client(request);c.connection.execute(c.connection.nextCommand('player','add-hole'));await vi.waitFor(()=>expect(c.onStatus).toHaveBeenCalled());expect(c.onResult).not.toHaveBeenCalled();
 await c.connection.synchronize();expect(c.onResult).toHaveBeenCalledTimes(1);expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);
});
test('terminal rejection releases the pending edit and spectator snapshots prevent further edits',async()=>{
 const error=Object.assign(Error('Unsupported command'),{status:400}),request=vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({...snapshot(),revision:1,role:'spectator'});
 const c=client(request);c.connection.execute(c.connection.nextCommand('player','bad-command'));await vi.waitFor(()=>expect(c.onResult).toHaveBeenCalled());await c.connection.synchronize();
 expect(c.connection.execute(c.connection.nextCommand('player','add-hole')).message).toContain('spectator');expect(request).toHaveBeenCalledTimes(2);
});
