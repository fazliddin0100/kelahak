import type { DateLike } from '@/types/document';

/** Mongo `$date`, ISO string yoki Date → Date */
export function toDate(value: DateLike | null | undefined): Date {
  if (value == null) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'object' && '$date' in value) {
    return new Date(value.$date);
  }
  return new Date(0);
}
