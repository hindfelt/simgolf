export function tournamentCalendar(event,origin){
 const escape=value=>String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const date=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 if(!Number.isSafeInteger(event.startsAt))return null;
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Fairway Baron//Tournaments//EN','BEGIN:VEVENT',`UID:${event.id}@fairway-baron`,`DTSTAMP:${date(event.createdAt)}`,`DTSTART:${date(event.startsAt)}`,`DTEND:${date(event.startsAt+event.durationHours*3600000)}`,`SUMMARY:${escape(event.title)}`,`DESCRIPTION:${escape('Sign in and join before the start. Complete all rounds during the playing window.')}`,`URL:${new URL('/?event='+encodeURIComponent(event.id),origin).href}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
