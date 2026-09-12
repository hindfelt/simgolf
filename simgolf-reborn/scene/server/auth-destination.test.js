import {test,expect} from 'vitest';
import {safeDestination,loginLocation} from '../src/auth-destination.js';
const id='11111111-1111-4111-8111-111111111111';
test('sign-in destinations allow only canonical game modes',()=>{
 for(const key of ['shared','event','earnings'])expect(safeDestination(`/?${key}=${id}`)).toBe(`/?${key}=${id}`);
 expect(safeDestination(`/?tournament=${id}&round=3`)).toBe(`/?tournament=${id}&round=3`);
 expect(safeDestination('/index.html?testing=1')).toBe('/?testing=1');
 expect(safeDestination(`/?event=${id}&next=https://evil.example`)).toBe(`/?event=${id}`);
 expect(new URL(loginLocation(`/?event=${id}`),'https://game.invalid').searchParams.get('returnTo')).toBe(`/?event=${id}`);
});
test('external, ambiguous, malformed and action destinations fall back to the game',()=>{
 for(const value of [null,{},'https://evil.example','//evil.example','/\\evil.example','/\n/evil.example','/%2f%2fevil.example','/api/auth/logout','/login.html',`/?shared=${id}&event=${id}`,'/?event=bad',`/?tournament=${id}&round=9`,'javascript:alert(1)'])expect(safeDestination(value)).toBe('/');
});
