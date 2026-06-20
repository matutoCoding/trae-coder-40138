import { create } from 'zustand';
import { TableType, Occupancy, PricingTier, BoardGame, Bill, GameRental, PricingBreakdown } from '../types';
import { mockTables, mockOccupancies, mockTiers, mockBoardGames, mockBills } from '../data/mock';
import { generateId, getOrderNo, todayStart, addHours } from '../utils/time';
import { calculatePricing } from '../utils/pricing';
import { mergeOccupancies, splitOccupancy, extendOccupancy, completeOccupancy, hasConflict, canMergeOccupancies } from '../utils/occupancy';

interface CreateOccupancyResult {
  success: boolean;
  occupancyId?: string;
  billId?: string;
}

interface AppState {
  tables: TableType[];
  occupancies: Occupancy[];
  tiers: PricingTier[];
  games: BoardGame[];
  bills: Bill[];
  selectedDate: number;

  addTable: (table: Omit<TableType, 'id'>) => void;
  updateTable: (id: string, updates: Partial<TableType>) => void;
  deleteTable: (id: string) => void;

  createOccupancy: (data: {
    tableId: string; playerName: string; playerPhone: string;
    startAt: number; endAt: number; selectedGameIds?: string[];
  }) => CreateOccupancyResult;

  createOccupancyWithAutoMerge: (data: {
    tableId: string; playerName: string; playerPhone: string;
    startAt: number; endAt: number; selectedGameIds?: string[];
  }) => CreateOccupancyResult;

  mergeTwoOccupancies: (idA: string, idB: string) => boolean;
  splitOccupancyAt: (id: string, splitAt: number, firstEndName?: string, secondStartName?: string) => boolean;
  extendOccupancyEnd: (id: string, newEndAt: number) => void;
  endOccupancy: (id: string) => void;

  addTier: (tier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTier: (id: string, updates: Partial<PricingTier>) => void;
  deleteTier: (id: string) => void;
  toggleTierEnabled: (id: string) => void;

  createBillFromOccupancy: (occupancyIds: string[], gameRentals?: GameRental[], inheritBillId?: string) => Bill;
  payBill: (billId: string) => void;
  refundBill: (billId: string) => void;
  updateBillDiscount: (billId: string, discount: number) => void;
  updateBillEndTime: (billId: string, endAt: number) => void;

  rentGame: (gameId: string, billId: string) => GameRental | undefined;
  returnGame: (rentalId: string) => void;
  addGame: (game: Omit<BoardGame, 'id'>) => void;
  updateGame: (id: string, updates: Partial<BoardGame>) => void;

  setSelectedDate: (date: number) => void;

  getActiveOccupanciesByTable: (tableId: string) => Occupancy[];
  findAdjacentMergeable: (occupancy: Occupancy) => Occupancy | null;
}

const buildBill = (
  occupancies: Occupancy[],
  gameRentals: GameRental[] = [],
  tiers: PricingTier[],
  overrides: Partial<Bill> = {}
): Bill => {
  const firstOcc = occupancies[0];
  const minStart = Math.min(...occupancies.map(o => o.startAt));
  const allCompleted = occupancies.every(o => o.status === 'completed');
  const now = Date.now();
  const rawMaxEnd = Math.max(...occupancies.map(o => o.endAt));
  const maxEnd = allCompleted ? rawMaxEnd : Math.min(rawMaxEnd, now);
  const totalHours = Math.max(0.01, (maxEnd - minStart) / (1000 * 60 * 60));
  const pricing = calculatePricing(totalHours, tiers);
  return {
    id: generateId(),
    orderNo: getOrderNo(),
    tableId: firstOcc.tableId,
    tableName: firstOcc.tableName,
    playerName: firstOcc.playerName,
    playerPhone: firstOcc.playerPhone,
    occupancyIds: occupancies.map(o => o.id),
    startAt: minStart,
    endAt: maxEnd,
    totalHours: pricing.totalHours,
    tableFee: pricing.totalAmount,
    gameRentalFee: 0,
    discount: 0,
    totalAmount: pricing.totalAmount,
    status: 'unpaid',
    pricingBreakdown: pricing.breakdown,
    gameRentals: [...gameRentals],
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
};

export const useStore = create<AppState>((set, get) => ({
  tables: mockTables,
  occupancies: mockOccupancies,
  tiers: mockTiers,
  games: mockBoardGames,
  bills: mockBills,
  selectedDate: todayStart(),

  addTable: (table) => set((state) => ({
    tables: [...state.tables, { ...table, id: generateId() }]
  })),
  updateTable: (id, updates) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  deleteTable: (id) => set((state) => ({
    tables: state.tables.filter(t => t.id !== id)
  })),

  createOccupancy: (data) => {
    const state = get();
    const table = state.tables.find(t => t.id === data.tableId);
    if (!table) return { success: false };
    if (hasConflict(state.occupancies, data.tableId, data.startAt, data.endAt)) {
      console.error('[Store] Occupancy conflict detected');
      Taro && Taro.showToast && Taro.showToast({ title: '该时段已被占用', icon: 'none' });
      return { success: false };
    }
    const now = Date.now();
    const newOcc: Occupancy = {
      id: generateId(),
      tableId: data.tableId,
      tableName: table.name,
      playerName: data.playerName,
      playerPhone: data.playerPhone,
      startAt: data.startAt,
      endAt: data.endAt,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    const rentals: GameRental[] = [];
    const gameIds = data.selectedGameIds || [];
    const newGames = state.games.map(g => {
      if (gameIds.includes(g.id) && g.availableQty > 0) {
        rentals.push({
          id: generateId(),
          gameId: g.id,
          gameName: g.name,
          billId: '',
          rentedAt: now,
          status: 'rented'
        });
        return { ...g, availableQty: g.availableQty - 1 };
      }
      return g;
    });

    const newBill = buildBill([newOcc], rentals, state.tiers);
    rentals.forEach(r => { r.billId = newBill.id; });
    newBill.gameRentals = [...rentals];

    set((s) => ({
      occupancies: [...s.occupancies, newOcc],
      tables: s.tables.map(t => t.id === data.tableId ? { ...t, status: 'occupied' as const } : t),
      games: newGames,
      bills: [...s.bills, newBill]
    }));

    console.log('[Store] Created occupancy:', newOcc.id, 'with bill:', newBill.orderNo, 'rentals:', rentals.length);
    return { success: true, occupancyId: newOcc.id, billId: newBill.id };
  },

  createOccupancyWithAutoMerge: (data) => {
    const result = get().createOccupancy(data);
    if (!result.success || !result.occupancyId) return result;

    setTimeout(() => {
      const state = get();
      const occ = state.occupancies.find(o => o.id === result.occupancyId);
      if (!occ) return;

      const adjacent = state.findAdjacentMergeable(occ);
      if (adjacent) {
        console.log('[Store] Auto-merge found adjacent:', adjacent.id);
        get().mergeTwoOccupancies(occ.id, adjacent.id);
      }
    }, 30);

    return result;
  },

  findAdjacentMergeable: (occupancy) => {
    const state = get();
    for (const other of state.occupancies) {
      if (other.id === occupancy.id) continue;
      if (canMergeOccupancies(occupancy, other)) {
        return other;
      }
    }
    return null;
  },

  mergeTwoOccupancies: (idA, idB) => {
    const state = get();
    const a = state.occupancies.find(o => o.id === idA);
    const b = state.occupancies.find(o => o.id === idB);
    if (!a || !b) { console.log('[Merge] 找不到占用'); return false; }

    const result = mergeOccupancies(a, b);
    if (!result.merged) { console.log('[Merge] 不可合并'); return false; }

    const relatedBills = state.bills.filter(bill =>
      bill.occupancyIds.includes(idA) || bill.occupancyIds.includes(idB)
    );
    console.log('[Merge] 涉及旧账单数:', relatedBills.length);

    const allRentals: GameRental[] = [];
    const billIdsToDelete: string[] = [];
    relatedBills.forEach(bill => {
      bill.gameRentals.forEach(r => {
        if (!allRentals.find(x => x.id === r.id)) {
          allRentals.push({ ...r });
        }
      });
      billIdsToDelete.push(bill.id);
    });

    const merged = result.result;
    const newBill = buildBill([merged], allRentals, state.tiers, {
      createdAt: Math.min(a.createdAt, b.createdAt)
    });
    newBill.gameRentals.forEach(r => { r.billId = newBill.id; });

    set((s) => ({
      occupancies: [
        ...s.occupancies.filter(o => o.id !== idA && o.id !== idB),
        merged
      ],
      bills: [
        ...s.bills.filter(b => !billIdsToDelete.includes(b.id)),
        newBill
      ]
    }));

    console.log('[Store] Merged:', idA, '+', idB, '->', merged.id, 'newBill:', newBill.orderNo);
    Taro && Taro.showToast && Taro.showToast({ title: '已自动合并相邻时段', icon: 'success' });
    return true;
  },

  splitOccupancyAt: (id, splitAt, firstEndName, secondStartName) => {
    const state = get();
    const original = state.occupancies.find(o => o.id === id);
    if (!original) { console.log('[Split] 找不到占用'); return false; }
    const result = splitOccupancy(original, splitAt, firstEndName, secondStartName);
    if (!result.split) { console.log('[Split] 不可分割'); return false; }

    const [part1, part2] = result.parts;

    const relatedBills = state.bills.filter(bill => bill.occupancyIds.includes(id));
    const allRentalsInBills: GameRental[] = [];
    const billIdsToDelete: string[] = [];
    let originalDiscount = 0;
    relatedBills.forEach(bill => {
      bill.gameRentals.forEach(r => {
        if (!allRentalsInBills.find(x => x.id === r.id)) allRentalsInBills.push({ ...r });
      });
      billIdsToDelete.push(bill.id);
      if (bill.discount > originalDiscount) originalDiscount = bill.discount;
    });

    const part1Rentals: GameRental[] = allRentalsInBills.map(r => ({ ...r }));
    const part2Rentals: GameRental[] = allRentalsInBills.map(r => ({ ...r, id: generateId() }));

    const bill1 = buildBill([part1], part1Rentals, state.tiers, {
      discount: originalDiscount,
      totalAmount: 0
    });
    bill1.gameRentals.forEach(r => { r.billId = bill1.id; });
    bill1.totalAmount = Math.max(0, bill1.tableFee + bill1.gameRentalFee - bill1.discount);

    const bill2 = buildBill([part2], part2Rentals, state.tiers, {});
    bill2.gameRentals.forEach(r => { r.billId = bill2.id; });

    set((s) => {
      const updatedGames = bill1Rentals.length > 0 ? s.games : s.games;
      return {
        occupancies: [
          ...s.occupancies.filter(o => o.id !== id),
          part1,
          part2
        ],
        bills: [
          ...s.bills.filter(b => !billIdsToDelete.includes(b.id)),
          bill1,
          bill2
        ],
        games: updatedGames
      };
    });

    console.log('[Store] Split OK:', id, '->', part1.id, '+', part2.id, 'bills:', [bill1.orderNo, bill2.orderNo]);
    Taro && Taro.showToast && Taro.showToast({
      title: '已拆分，前半段可结账',
      icon: 'success'
    });
    return true;
  },

  extendOccupancyEnd: (id, newEndAt) => set((state) => ({
    occupancies: state.occupancies.map(o =>
      o.id === id ? extendOccupancy(o, newEndAt) : o
    )
  })),

  endOccupancy: (id) => {
    const state = get();
    const occ = state.occupancies.find(o => o.id === id);
    if (!occ) return;
    const completed = completeOccupancy(occ);

    set((s) => {
      const newOccupancies = s.occupancies.map(o => o.id === id ? completed : o);
      const newTables = s.tables.map(t => {
        const stillOccupied = newOccupancies.some(o =>
          o.tableId === t.id && o.status === 'active'
        );
        return stillOccupied ? t : { ...t, status: 'free' as const };
      });
      const now = Date.now();
      const newBills = s.bills.map(bill => {
        if (!bill.occupancyIds.includes(id)) return bill;
        const occsForBill = newOccupancies.filter(o => bill.occupancyIds.includes(o.id));
        if (occsForBill.length === 0) return bill;
        const billAllCompleted = occsForBill.every(o => o.status === 'completed');
        if (!billAllCompleted) return bill;
        const minStart = Math.min(...occsForBill.map(o => o.startAt));
        const maxEnd = Math.max(...occsForBill.map(o => o.endAt));
        const totalHours = Math.max(0.01, (maxEnd - minStart) / (1000 * 60 * 60));
        const pricing = calculatePricing(totalHours, s.tiers);
        return {
          ...bill,
          startAt: minStart,
          endAt: maxEnd,
          totalHours: pricing.totalHours,
          tableFee: pricing.totalAmount,
          totalAmount: Math.max(0, pricing.totalAmount + bill.gameRentalFee - bill.discount),
          pricingBreakdown: pricing.breakdown,
          updatedAt: now
        };
      });
      return { occupancies: newOccupancies, tables: newTables, bills: newBills };
    });
  },

  addTier: (tier) => set((state) => ({
    tiers: [...state.tiers, {
      ...tier,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }].sort((a, b) => a.tierIndex - b.tierIndex)
  })),
  updateTier: (id, updates) => set((state) => ({
    tiers: state.tiers.map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
    ).sort((a, b) => a.tierIndex - b.tierIndex)
  })),
  deleteTier: (id) => set((state) => ({
    tiers: state.tiers.filter(t => t.id !== id)
  })),
  toggleTierEnabled: (id) => set((state) => ({
    tiers: state.tiers.map(t =>
      t.id === id ? { ...t, enabled: !t.enabled, updatedAt: Date.now() } : t
    )
  })),

  createBillFromOccupancy: (occupancyIds, gameRentals = []) => {
    const state = get();
    const occupancies = state.occupancies.filter(o => occupancyIds.includes(o.id));
    if (occupancies.length === 0) return {} as Bill;
    const bill = buildBill(occupancies, gameRentals || [], state.tiers);
    set((s) => ({ bills: [...s.bills, bill] }));
    console.log('[Store] Created bill:', bill.orderNo);
    return bill;
  },

  updateBillEndTime: (billId, endAt) => set((state) => {
    const now = Date.now();
    const newBills = state.bills.map(bill => {
      if (bill.id !== billId) return bill;
      const occs = state.occupancies.filter(o => bill.occupancyIds.includes(o.id));
      if (occs.length === 0) return bill;
      const minStart = Math.min(...occs.map(o => o.startAt));
      const maxEnd = endAt;
      const totalHours = Math.max(0.01, (maxEnd - minStart) / (1000 * 60 * 60));
      const pricing = calculatePricing(totalHours, state.tiers);
      return {
        ...bill,
        endAt: maxEnd,
        totalHours: pricing.totalHours,
        tableFee: pricing.totalAmount,
        pricingBreakdown: pricing.breakdown,
        totalAmount: Math.max(0, pricing.totalAmount + bill.gameRentalFee - bill.discount),
        updatedAt: now
      };
    });
    return { bills: newBills };
  }),

  payBill: (billId) => set((state) => ({
    bills: state.bills.map(b =>
      b.id === billId ? { ...b, status: 'paid' as const, paidAt: Date.now(), updatedAt: Date.now() } : b
    )
  })),
  refundBill: (billId) => set((state) => ({
    bills: state.bills.map(b =>
      b.id === billId ? { ...b, status: 'refunded' as const, updatedAt: Date.now() } : b
    )
  })),
  updateBillDiscount: (billId, discount) => set((state) => ({
    bills: state.bills.map(b => {
      if (b.id !== billId) return b;
      const newTotal = Math.max(0, b.tableFee + b.gameRentalFee - discount);
      return {
        ...b,
        discount,
        totalAmount: newTotal,
        updatedAt: Date.now()
      };
    })
  })),

  rentGame: (gameId, billId) => {
    const state = get();
    const game = state.games.find(g => g.id === gameId);
    if (!game || game.availableQty <= 0) return undefined;
    const now = Date.now();
    const rental: GameRental = {
      id: generateId(),
      gameId,
      gameName: game.name,
      billId,
      rentedAt: now,
      status: 'rented'
    };
    set((s) => ({
      games: s.games.map(g => g.id === gameId ? { ...g, availableQty: g.availableQty - 1 } : g),
      bills: s.bills.map(b => b.id === billId ? {
        ...b,
        gameRentals: [...b.gameRentals, rental],
        updatedAt: now
      } : b)
    }));
    console.log('[Store] Rent game:', game.name, 'for bill:', billId);
    return rental;
  },

  returnGame: (rentalId) => {
    const state = get();
    const rental = state.bills.flatMap(b => b.gameRentals).find(r => r.id === rentalId);
    if (!rental) return;
    set((s) => ({
      games: s.games.map(g => g.id === rental.gameId ? { ...g, availableQty: g.availableQty + 1 } : g),
      bills: s.bills.map(b => ({
        ...b,
        gameRentals: b.gameRentals.map(r =>
          r.id === rentalId ? { ...r, status: 'returned' as const, returnedAt: Date.now() } : r
        )
      }))
    }));
  },
  addGame: (game) => set((state) => ({
    games: [...state.games, { ...game, id: generateId() }]
  })),
  updateGame: (id, updates) => set((state) => ({
    games: state.games.map(g => g.id === id ? { ...g, ...updates } : g)
  })),

  setSelectedDate: (date) => set({ selectedDate: date }),

  getActiveOccupanciesByTable: (tableId) => {
    const state = get();
    return state.occupancies.filter(o => o.tableId === tableId && o.status === 'active');
  }
}));
