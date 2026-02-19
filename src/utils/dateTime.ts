/**
 * Converts a Date object or ISO string to the format required by datetime-local input
 * Preserves the actual date/time without timezone conversion
 */
export function toDateTimeLocalString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Get the date components in local timezone
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts a datetime-local input value to an ISO string
 * The input value is in format: "2024-03-15T14:30"
 * We interpret this as the local Brussels time
 */
export function fromDateTimeLocalString(dateTimeLocal: string): string {
  // Create date object from the datetime-local string
  // This will be interpreted as local time
  const date = new Date(dateTimeLocal);

  return date.toISOString();
}

/**
 * Formats a date string for display in Belgian format with Brussels timezone
 */
export function formatBelgianDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('nl-BE', {
    timeZone: 'Europe/Brussels',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a date string for display in a longer format
 */
export function formatLongDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('nl-NL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
