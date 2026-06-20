import { Occupancy } from '../types';
import { isAdjacent, generateId, isOverlap } from './time';

export interface OccupancyMergeResult {
  merged: boolean;
  result: Occupancy;
}

export const canMergeOccupancies = (
  a: Occupancy, b: Occupancy, toleranceMin: number = 5): boolean => {
  if (a.tableId !== b.tableId) return false;
  if (a.status !== 'active' || b.status !== 'active') return false;
  if (a.playerName !== b.playerName) return false;
  return isAdjacent(a.endAt, b.startAt, toleranceMin) || isAdjacent(b.endAt, a.startAt, toleranceMin);
};

export const mergeOccupancies = (
  a: Occupancy, b: Occupancy): OccupancyMergeResult => {
  if (!canMergeOccupancies(a, b)) {
    return { merged: false, result: a };
  }

  const newStart = Math.min(a.startAt, b.startAt);
  const newEnd = Math.max(a.endAt, b.endAt);

  const merged: Occupancy = {
    id: generateId(),
    tableId: a.tableId,
    tableName: a.tableName,
    playerName: a.playerName,
    playerPhone: a.playerPhone || b.playerPhone,
    startAt: newStart,
    endAt: newEnd,
    mergedFrom: [
      ...(a.mergedFrom || [a.id]),
      ...(b.mergedFrom || [b.id])
    ],
    splitFrom: a.splitFrom || b.splitFrom,
    status: 'active',
    createdAt: Math.min(a.createdAt, b.createdAt),
    updatedAt: Date.now()
  };

  console.log('[Occupancy] Merged:', a.id, '+', b.id, '->', merged.id);
  return { merged: true, result: merged };
};

export interface SplitResult {
  split: boolean;
  parts: Occupancy[];
}

export const splitOccupancy = (
  original: Occupancy,
  splitPoint: number,
  firstPartEndName?: string,
  secondPartStartName?: string
): SplitResult => {
  if (splitPoint <= original.startAt || splitPoint >= original.endAt) {
    return { split: false, parts: [original] };
  }

  const now = Date.now();
  const part1: Occupancy = {
    id: generateId(),
    tableId: original.tableId,
    tableName: original.tableName,
    playerName: firstPartEndName || original.playerName,
    playerPhone: original.playerPhone,
    startAt: original.startAt,
    endAt: splitPoint,
    mergedFrom: original.mergedFrom,
    splitFrom: original.id,
    status: 'completed',
    createdAt: original.createdAt,
    updatedAt: now
  };

  const part2: Occupancy = {
    id: generateId(),
    tableId: original.tableId,
    tableName: original.tableName,
    playerName: secondPartStartName || '新顾客',
    playerPhone: '',
    startAt: splitPoint,
    endAt: original.endAt,
    mergedFrom: original.mergedFrom,
    splitFrom: original.id,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };

  console.log('[Occupancy] Split:', original.id, 'at', splitPoint, '->', [part1.id, part2.id]);
  return { split: true, parts: [part1, part2] };
};

export const hasConflict = (
  occupancies: Occupancy[],
  tableId: string,
  start: number,
  end: number,
  excludeId?: string
): boolean => {
  return occupancies.some(o => {
    if (o.tableId !== tableId) return false;
    if (excludeId && o.id === excludeId) return false;
    if (o.status === 'cancelled' || o.status === 'completed') return false;
    return isOverlap(start, end, o.startAt, o.endAt);
  });
};

export const extendOccupancy = (
  occupancy: Occupancy,
  newEndAt: number
): Occupancy => {
  return {
    ...occupancy,
    endAt: newEndAt,
    updatedAt: Date.now()
  };
};

export const completeOccupancy = (
  occupancy: Occupancy
): Occupancy => {
  return {
    ...occupancy,
    endAt: Date.now(),
    status: 'completed',
    updatedAt: Date.now()
  };
};
