import { TEEvent } from '../types';

/**
 * Generate iCalendar (RFC 5545 / .ics) format for Apple Calendar, iOS Calendar, and macOS Calendar
 */
export function generateICalendarData(events: TEEvent[]): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const formatICSDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  };

  const escapeICS = (text: string = ''): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const nowUTC = formatICSDate(new Date().toISOString());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Teenage Engineering//OP-CAL Field Calendar 2.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:OP-CAL Field Matrix',
    'X-WR-TIMEZONE:UTC',
    'X-APPLE-CALENDAR-COLOR:#FF4C00',
  ];

  events.forEach((ev) => {
    const uid = ev.id ? `${ev.id}@opcal.local` : `opcal-${Date.now()}-${Math.random()}@opcal.local`;
    const dtstart = ev.start.dateTime 
      ? formatICSDate(ev.start.dateTime)
      : ev.start.date 
      ? ev.start.date.replace(/-/g, '') 
      : nowUTC;

    const dtend = ev.end.dateTime 
      ? formatICSDate(ev.end.dateTime)
      : ev.end.date 
      ? ev.end.date.replace(/-/g, '') 
      : nowUTC;

    const isAllDay = !ev.start.dateTime && !!ev.start.date;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowUTC}`);

    if (isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
      lines.push(`DTEND;VALUE=DATE:${dtend}`);
    } else {
      lines.push(`DTSTART:${dtstart}`);
      lines.push(`DTEND:${dtend}`);
    }

    lines.push(`SUMMARY:${escapeICS(ev.summary || 'OP-CAL Event')}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeICS(ev.location)}`);

    // Apple Calendar Alarms (VALARM) matching TE custom reminders
    (ev.reminders || []).forEach((rem) => {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeICS(`[OP-CAL ${rem.actionTag || 'ALERT'}] ${ev.summary}`)}`);
      if (rem.leadMinutes === 0) {
        lines.push('TRIGGER:PT0S');
      } else {
        lines.push(`TRIGGER:-PT${rem.leadMinutes}M`);
      }
      lines.push('END:VALARM');
    });

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Trigger direct Apple Calendar sync (.ics download or webcal subscription launch)
 */
export function syncToAppleCalendar(events: TEEvent[], filename: string = 'op-cal-field.ics') {
  const icsData = generateICalendarData(events);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a webcal data URI that prompts macOS / iOS Apple Calendar to subscribe
 */
export function getAppleCalendarWebcalUri(events: TEEvent[]): string {
  const ics = generateICalendarData(events);
  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}

/**
 * Parse an imported Apple Calendar .ics file into TEEvent structures
 */
export function parseICSFile(icsContent: string): TEEvent[] {
  const events: TEEvent[] = [];
  const lines = icsContent.split(/\r\n|\n|\r/);
  let currentEvent: Partial<TEEvent> | null = null;
  let currentAlarmMinutes: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {
        id: `apple-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        summary: '',
        reminders: [],
        colorId: '6',
        start: {},
        end: {},
      };
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.summary) {
        if (!currentEvent.end?.dateTime && currentEvent.start?.dateTime) {
          const endDate = new Date(new Date(currentEvent.start.dateTime).getTime() + 60 * 60 * 1000);
          currentEvent.end = { dateTime: endDate.toISOString() };
        }
        events.push(currentEvent as TEEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8).replace(/\\n/g, ' ').replace(/\\,/g, ',');
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12).replace(/\\n/g, '\n').replace(/\\,/g, ',');
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9).replace(/\\,/g, ',');
      } else if (line.startsWith('DTSTART')) {
        const val = line.split(':')[1];
        if (val) {
          if (val.length === 8) {
            // YYYYMMDD
            currentEvent.start = { date: `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}` };
          } else {
            // Parse YYYYMMDDTHHMMSSZ
            const d = parseICSDateTime(val);
            if (d) currentEvent.start = { dateTime: d.toISOString() };
          }
        }
      } else if (line.startsWith('DTEND')) {
        const val = line.split(':')[1];
        if (val) {
          if (val.length === 8) {
            currentEvent.end = { date: `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}` };
          } else {
            const d = parseICSDateTime(val);
            if (d) currentEvent.end = { dateTime: d.toISOString() };
          }
        }
      } else if (line.startsWith('TRIGGER:')) {
        const triggerStr = line.split(':')[1];
        if (triggerStr === 'PT0S') {
          currentAlarmMinutes = 0;
        } else if (triggerStr.includes('M')) {
          const match = triggerStr.match(/(\d+)M/);
          if (match) currentAlarmMinutes = parseInt(match[1]);
        }
        if (currentAlarmMinutes !== null && currentEvent.reminders) {
          currentEvent.reminders.push({
            id: `rem-ics-${Date.now()}-${Math.random()}`,
            leadMinutes: currentAlarmMinutes,
            sound: currentAlarmMinutes <= 5 ? 'radar' : 'chime',
            actionTag: 'SYNC',
          });
          currentAlarmMinutes = null;
        }
      }
    }
  }

  return events;
}

function parseICSDateTime(str: string): Date | null {
  try {
    const clean = str.replace(/Z$/, '');
    const year = parseInt(clean.slice(0, 4));
    const month = parseInt(clean.slice(4, 6)) - 1;
    const day = parseInt(clean.slice(6, 8));
    const hours = parseInt(clean.slice(9, 11)) || 0;
    const minutes = parseInt(clean.slice(11, 13)) || 0;
    const seconds = parseInt(clean.slice(13, 15)) || 0;

    if (str.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    }
    return new Date(year, month, day, hours, minutes, seconds);
  } catch {
    return null;
  }
}
