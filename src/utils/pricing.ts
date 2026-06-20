import { PricingTier, PricingResult, PricingBreakdown } from '../types';
import { generateId, formatDuration } from './time';

export const calculatePricing = (
  totalHours: number,
  tiers: PricingTier[]
): PricingResult => {
  const sortedTiers = [...tiers]
    .filter(t => t.enabled)
    .sort((a, b) => a.tierIndex - b.tierIndex);

  if (sortedTiers.length === 0) {
    return {
      totalHours,
      breakdown: [],
      totalAmount: 0
    };
  }

  const breakdown: PricingBreakdown[] = [];
  let remainingHours = totalHours;
  let totalAmount = 0;
  let approachingTier: PricingResult['approachingTier'] = undefined;

  for (let i = 0; i < sortedTiers.length; i++) {
    const tier = sortedTiers[i];
    const tierStart = tier.startHour;
    const tierEnd = tier.endHour ?? Infinity;
    const tierDuration = tierEnd - tierStart;

    if (totalHours <= tierStart) {
      const hoursToNext = tierStart - totalHours;
      if (hoursToNext > 0 && hoursToNext < 1) {
        approachingTier = {
          tierName: tier.name,
          hoursToNext
        };
      }
      break;
    }

    const effectiveStart = Math.max(0, remainingHours - (tierStart));
    const hoursInTier = remainingHours > tierEnd && tierEnd !== Infinity
      ? tierDuration
      : remainingHours - tierStart;

    if (hoursInTier > 0) {
      const subtotal = Math.round(hoursInTier * tier.rate * 100) / 100;
      breakdown.push({
        tierId: tier.id,
        tierName: tier.name,
        tierRate: tier.rate,
        hoursUsed: Math.round(hoursInTier * 100) / 100,
        subtotal
      });
      totalAmount = Math.round((totalAmount + subtotal) * 100) / 100;
    }

    if (remainingHours <= tierEnd) {
      if (i < sortedTiers.length - 1 && tierEnd !== Infinity) {
        const nextTier = sortedTiers[i + 1];
        const hoursToNext = nextTier.startHour - totalHours;
        if (hoursToNext > 0 && hoursToNext < 1) {
          approachingTier = {
            tierName: nextTier.name,
            hoursToNext
          };
        }
      }
      break;
    }

    if (i === sortedTiers.length - 1 && tier.endHour === null) {
      break;
    }
  }

  console.log('[Pricing] Calculated:', { totalHours, totalAmount, tiers: breakdown.length });
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    breakdown,
    totalAmount: Math.round(totalAmount * 100) / 100,
    approachingTier
  };
};

export const createDefaultTiers = (): PricingTier[] => {
  const now = Date.now();
  return [
    {
      id: generateId(),
      tierIndex: 1,
      name: '首小时',
      startHour: 0,
      endHour: 1,
      rate: 15,
      description: '第1小时优惠价',
      enabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateId(),
      tierIndex: 2,
      name: '2-3小时',
      startHour: 1,
      endHour: 3,
      rate: 20,
      description: '第2-3小时标准价',
      enabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateId(),
      tierIndex: 3,
      name: '4-5小时',
      startHour: 3,
      endHour: 5,
      rate: 25,
      description: '第4-5小时加价',
      enabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateId(),
      tierIndex: 4,
      name: '6小时以上',
      startHour: 5,
      endHour: null,
      rate: 30,
      description: '超过5小时后高峰价',
      enabled: true,
      createdAt: now,
      updatedAt: now
    }
  ];
};

export const validateTier = (tier: Partial<PricingTier>, allTiers: PricingTier[]): string | null => {
  if (!tier.name || tier.name.trim() === '') return '档位名称不能为空';
  if (tier.rate === undefined || tier.rate < 0) return '单价不能为负数';
  if (tier.startHour === undefined || tier.startHour < 0) return '起始小时不能为负数';
  if (tier.endHour !== null && tier.endHour !== undefined) {
    if (tier.endHour <= tier.startHour) return '结束小时必须大于起始小时';
  }
  for (const other of allTiers) {
    if (other.id === tier.id) continue;
    const oStart = other.startHour;
    const oEnd = other.endHour ?? Infinity;
    const tStart = tier.startHour!;
    const tEnd = tier.endHour ?? Infinity;
    if (tStart < oEnd && tEnd > oStart) {
      return `档位时间与"${other.name}"重叠`;
    }
  }
  return null;
};

export const getTierLabel = (tier: PricingTier): string => {
  if (tier.endHour === null) {
    return `${tier.startHour}小时以上`;
  }
  return `${tier.startHour}-${tier.endHour}小时`;
};

export const formatApproachingNotice = (approaching?: PricingResult['approachingTier']): string => {
  if (!approaching) return '';
  const minutes = Math.round(approaching.hoursToNext * 60);
  return `距离进入「${approaching.tierName}」还有约${minutes}分钟`;
};

export const calculateEstimate = (
  startAt: number,
  planEndAt: number,
  tiers: PricingTier[]
): { pricing: PricingResult; warning: string } => {
  const totalHours = (planEndAt - startAt) / (1000 * 60 * 60);
  const pricing = calculatePricing(totalHours, tiers);
  const warning = formatApproachingNotice(pricing.approachingTier);
  return { pricing, warning };
};
