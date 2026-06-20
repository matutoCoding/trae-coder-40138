import { create } from 'zustand';
import { TableType, Occupancy, PricingTier, BoardGame, Bill, GameRental, PricingBreakdown } from '../types';
import { mockTables, mockOccupancies, mockTiers, mockBoardGames, mockBills } from '../data/mock';
import { generateId, getOrderNo, todayStart, addHours } from '../utils/time';
import { calculatePricing } from '../utils/pricing';
import { mergeOccupancies, splitOccupancy, extendOccupancy, completeOccupancy, hasConflict } from '../utils/occupancy';

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

  createOccupancy: (data: { tableId: string; playerName: string; playerPhone: string; startAt: number; endAt: number }) => void;
  mergeTwoOccupancies: (idA: string, idB: string) => boolean;
  splitOccupancyAt: (id: string, splitAt: number, firstEndName?: string, secondStartName?: string) => boolean;
  extendOccupancyEnd: (id: string, newEndAt: number) => void;
  endOccupancy: (id: string) => void;

  addTier: (tier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTier: (id: string, updates: Partial<PricingTier>) => void;
  deleteTier: (id: string) => void;
  toggleTierEnabled: (id: string) => void;

  createBillFromOccupancy: (occupancyIds: string[], gameRentals: GameRental[]) => Bill;
  payBill: (billId: string) => void;
  refundBill: (billId: string) => void;
  updateBillDiscount: (billId: string, discount: number) => void;

  rentGame: (gameId: string, billId: string) => void;
  returnGame: (rentalId: string) => void;
  addGame: (game: Omit<BoardGame, 'id'>) => void;
  updateGame: (id: string, updates: Partial<BoardGame>) => void;

  setSelectedDate: (date: number) => void;

  getActiveOccupanciesByTable: (tableId: string) => Occupancy[];
}

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
    if (!table) return;
    if (hasConflict(state.occupancies, data.tableId, data.startAt, data.endAt)) {
      console.error('[Store] Occupancy conflict detected');
      return;
    }
    const newOcc: Occupancy = {
      id: generateId(),
      ...data,
      tableName: table.name,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    set((s) => ({
      occupancies: [...s.occupancies, newOcc],
      tables: s.tables.map(t => t.id === data.tableId ? { ...t, status: 'occupied' } : t)
    }));
    console.log('[Store] Created occupancy:', newOcc.id);
  },
  mergeTwoOccupancies: (idA, idB) => {
    const state = get();
    const a = state.occupancies.find(o => o.id === idA);
    const b = state.occupancies.find(o => o.id === idB);
    if (!a || !b) return false;
    const result = mergeOccupancies(a, b);
    if (!result.merged) return false;
    set((s) => ({
      occupancies: [
        ...s.occupancies.filter(o => o.id !== idA && o.id !== idB),
        result.result
      ]
    }));
    return true;
  },
  splitOccupancyAt: (id, splitAt, firstEndName, secondStartName) => {
    const state = get();
    const original = state.occupancies.find(o => o.id === id);
    if (!original) return false;
    const result = splitOccupancy(original, splitAt, firstEndName, secondStartName);
    if (!result.split) return false;
    set((s) => ({
      occupancies: [
        ...s.occupancies.filter(o => o.id !== id),
        ...result.parts
      ]
    }));
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
    set((s) => ({
      occupancies: s.occupancies.map(o => o.id === id ? completed : o),
      tables: s.tables.map(t => {
        const stillOccupied = s.occupancies.some(o =>
          o.tableId === t.id && o.status === 'active' && o.id !== id
        );
        return stillOccupied ? t : { ...t, status: 'free' };
      })
    }));
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

  createBillFromOccupancy: (occupancyIds, gameRentals) => {
    const state = get();
    const occupancies = state.occupancies.filter(o => occupancyIds.includes(o.id));
    if (occupancies.length === 0) return {} as Bill;
    const firstOcc = occupancies[0];
    const minStart = Math.min(...occupancies.map(o => o.startAt));
    const maxEnd = Math.max(...occupancies.map(o => o.endAt > Date.now() ? Date.now() : o.endAt));
    const totalHours = (maxEnd - minStart) / (1000 * 60 * 60);
    const pricing = calculatePricing(totalHours, state.tiers);
    const bill: Bill = {
      id: generateId(),
      orderNo: getOrderNo(),
      tableId: firstOcc.tableId,
      tableName: firstOcc.tableName,
      playerName: firstOcc.playerName,
      playerPhone: firstOcc.playerPhone,
      occupancyIds,
      startAt: minStart,
      endAt: maxEnd,
      totalHours: pricing.totalHours,
      tableFee: pricing.totalAmount,
      gameRentalFee: 0,
      discount: 0,
      totalAmount: pricing.totalAmount,
      status: 'unpaid',
      pricingBreakdown: pricing.breakdown,
      gameRentals,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    set((s) => ({ bills: [...s.bills, bill]));
    console.log('[Store] Created bill:', bill.orderNo);
    return bill;
  },
  payBill: (billId) => set((state) => ({
    bills: state.bills.map(b =>
      b.id === billId ? { ...b, status: 'paid', paidAt: Date.now(), updatedAt: Date.now() } : b
    )
  })),
  refundBill: (billId) => set((state) => ({
    bills: state.bills.map(b =>
      b.id === billId ? { ...b, status: 'refunded', updatedAt: Date.now() } : b
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
    if (!game || game.availableQty <= 0) return;
    const rental: GameRental = {
      id: generateId(),
      gameId,
      gameName: game.name,
      billId,
      rentedAt: Date.now(),
      status: 'rented'
    };
    set((s) => ({
      games: s.games.map(g => g.id === gameId ? { ...g, availableQty: g.availableQty - 1 } : g),
      bills: s.bills.map(b => b.id === billId ? {
        ...b,
        gameRentals: [...b.gameRentals, rental],
        updatedAt: Date.now()
      } : b)
    }));
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
          r.id === rentalId ? { ...r, status: 'returned', returnedAt: Date.now() } : r
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
