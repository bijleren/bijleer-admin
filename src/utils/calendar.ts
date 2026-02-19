export function generateICS(
  title: string,
  description: string,
  location: string,
  startDate: Date,
  durationMinutes: number
): string {
  const belgianDate = new Date(
    startDate.toLocaleString('en-US', { timeZone: 'Europe/Brussels' })
  );
  const endDate = new Date(belgianDate.getTime() + durationMinutes * 60000);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  };

  const stripHTML = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const cleanDescription = stripHTML(description).replace(/\n/g, '\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Demo Session//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART;TZID=Europe/Brussels:${formatDate(belgianDate)}`,
    `DTEND;TZID=Europe/Brussels:${formatDate(endDate)}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${cleanDescription}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  return icsContent;
}

export function downloadICS(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
