export type TableStatus = 'free' | 'occupied' | 'reserved';

export interface TableType {
  id: string;
  name: string;
  tableNo: string;
  type: string;
  capacity: number;
  location: string;
  status: TableStatus;
  baseRate: number;
}

export interface TimeSlot {
  start: number;
  end: number;
}

export interface Occupancy {
  id: string;
  tableId: string;
  tableName: string;
  playerName: string;
  playerPhone: string;
  startAt: number;
  endAt: number;
  mergedFrom?: string[];
  splitFrom?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface PricingTier {
  id: string;
  tierIndex: number;
  name: string;
  startHour: number;
  endHour: number | null;
  rate: number;
  description: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PricingBreakdown {
  tierId: string;
  tierName: string;
  tierRate: number;
  hoursUsed: number;
  subtotal: number;
}

export interface PricingResult {
  totalHours: number;
  breakdown: PricingBreakdown[];
  totalAmount: number;
  approachingTier?: {
    tierName: string;
    hoursToNext: number;
  };
}

export interface BoardGame {
  id: string;
  name: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  players: string;
  totalQty: number;
  availableQty: number;
  description: string;
}

export interface GameRental {
  id: string;
  gameId: string;
  gameName: string;
  billId: string;
  rentedAt: number;
  returnedAt?: number;
  status: 'rented' | 'returned';
}

export interface Bill {
  id: string;
  orderNo: string;
  tableId: string;
  tableName: string;
  playerName: string;
  playerPhone: string;
  occupancyIds: string[];
  startAt: number;
  endAt: number;
  totalHours: number;
  tableFee: number;
  gameRentalFee: number;
  discount: number;
  totalAmount: number;
  status: 'unpaid' | 'paid' | 'refunded';
  pricingBreakdown: PricingBreakdown[];
  gameRentals: GameRental[];
  paidAt?: number;
  remark?: string;
  createdAt: number;
  updatedAt: number;
}
