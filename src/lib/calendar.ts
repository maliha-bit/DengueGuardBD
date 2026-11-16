export interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  durationMinutes: number;
  location?: string;
  description?: string;
}

const icsDate = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** iCalendar (.ics) text for one event — works with Google, Apple and Outlook calendars. */
export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DengueGuard BD//Appointments//EN',
    'BEGIN:VEVENT',
    `UID:${event.uid}@dengueguard.bd`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

/** Download the event as an .ics file. */
export function downloadIcs(event: CalendarEvent, fileName = 'appointment.ics') {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
