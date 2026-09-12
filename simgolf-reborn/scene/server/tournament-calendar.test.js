import {test,expect} from 'vitest';
import {tournamentCalendar} from '../src/tournament-calendar.js';
test('calendar uses UTC and escapes event text instead of injecting properties',()=>{
 const value=tournamentCalendar({id:'abc',title:'Cup\nATTENDEE:bad,yes;',startsAt:Date.UTC(2026,8,13,15),createdAt:Date.UTC(2026,8,12),durationHours:24},'https://example.com');
 expect(value).toContain('DTSTART:20260913T150000Z\r\n');expect(value).toContain('DTEND:20260914T150000Z');expect(value).toContain('Cup\\nATTENDEE:bad\\,yes\\;');expect(value).not.toContain('\r\nATTENDEE:');
});
