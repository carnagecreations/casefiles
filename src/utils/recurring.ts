import { CleaningFrequency } from '../types';

/**
 * Given a YYYY-MM-DD date and a recurring frequency, returns the next
 * service date in the same format. Used to auto-schedule a client's next
 * visit once their current job is marked completed.
 */
export function nextRecurrenceDate(dateStr: string, frequency: CleaningFrequency): string | null {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;

  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'bi-weekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'one-time':
    default:
      return null;
  }

  return d.toISOString().split('T')[0];
}
