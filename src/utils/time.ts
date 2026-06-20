import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

export const formatDate = (timestamp: number, format: string = 'YYYY-MM-DD HH:mm'): string => {
  return dayjs(timestamp).format(format);
};

export const formatTime = (timestamp: number): string => {
  return dayjs(timestamp).format('HH:mm');
};

export const formatHour = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm');
};

export const formatDateOnly = (timestamp: number): string => {
  return dayjs(timestamp).format('MM-DD');
};

export const getHoursDiff = (start: number, end: number): number => {
  const ms = end - start;
  return Math.max(0, ms / (1000 * 60 * 60));
};

export const getMinutesDiff = (start: number, end: number): number => {
  const ms = end - start;
  return Math.max(0, ms / (1000 * 60));
};

export const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
};

export const formatDurationShort = (hours: number): string => {
  return hours.toFixed(1) + 'h';
};

export const todayStart = (): number => {
  return dayjs().startOf('day').valueOf();
};

export const todayEnd = (): number => {
  return dayjs().endOf('day').valueOf();
};

export const addHours = (timestamp: number, hours: number): number => {
  return dayjs(timestamp).add(hours, 'hour').valueOf();
};

export const addMinutes = (timestamp: number, minutes: number): number => {
  return dayjs(timestamp).add(minutes, 'minute').valueOf();
};

export const isOverlap = (
  aStart: number, aEnd: number,
  bStart: number, bEnd: number
): boolean => {
  return aStart < bEnd && aEnd > bStart;
};

export const isAdjacent = (
  aEnd: number,
  bStart: number,
  toleranceMin: number = 5
): boolean => {
  const diff = Math.abs(bStart - aEnd);
  return diff <= toleranceMin * 60 * 1000;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const getOrderNo = (): string => {
  return 'BG' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
};
