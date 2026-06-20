import { TableType, Occupancy, PricingTier, BoardGame, Bill, GameRental } from '../types';
import { createDefaultTiers } from '../utils/pricing';
import { generateId, todayStart, addHours, getOrderNo, formatDate } from '../utils/time';

const now = Date.now();
const today = todayStart();

export const mockTables: TableType[] = [
  {
    id: 't1',
    name: '大厅A1',
    tableNo: 'A1',
    type: '大桌',
    capacity: 8,
    location: '大厅靠窗',
    status: 'occupied',
    baseRate: 20
  },
  {
    id: 't2',
    name: '大厅A2',
    tableNo: 'A2',
    type: '中桌',
    capacity: 6,
    location: '大厅中央',
    status: 'occupied',
    baseRate: 18
  },
  {
    id: 't3',
    name: '大厅A3',
    tableNo: 'A3',
    type: '小桌',
    capacity: 4,
    location: '大厅角落',
    status: 'free',
    baseRate: 15
  },
  {
    id: 't4',
    name: '包间B1',
    tableNo: 'B1',
    type: 'VIP包间',
    capacity: 10,
    location: '独立包间',
    status: 'reserved',
    baseRate: 35
  },
  {
    id: 't5',
    name: '包间B2',
    tableNo: 'B2',
    type: '标准包间',
    capacity: 6,
    location: '独立包间',
    status: 'free',
    baseRate: 25
  },
  {
    id: 't6',
    name: '大厅C1',
    tableNo: 'C1',
    type: '情侣桌',
    capacity: 2,
    location: '安静区',
    status: 'free',
    baseRate: 12
  },
  {
    id: 't7',
    name: '大厅C2',
    tableNo: 'C2',
    type: '大桌',
    capacity: 8,
    location: '竞技区',
    status: 'free',
    baseRate: 22
  },
  {
    id: 't8',
    name: '包间B3',
    tableNo: 'B3',
    type: '豪华包间',
    capacity: 12,
    location: 'VIP区域',
    status: 'free',
    baseRate: 45
  }
];

export const mockOccupancies: Occupancy[] = [
  {
    id: 'o1',
    tableId: 't1',
    tableName: '大厅A1',
    playerName: '张先生',
    playerPhone: '138****1234',
    startAt: addHours(today, 10),
    endAt: addHours(today, 14),
    status: 'active',
    createdAt: addHours(today, 10),
    updatedAt: addHours(today, 10)
  },
  {
    id: 'o2',
    tableId: 't2',
    tableName: '大厅A2',
    playerName: '李小姐',
    playerPhone: '139****5678',
    startAt: addHours(today, 13),
    endAt: addHours(today, 17),
    status: 'active',
    createdAt: addHours(today, 13),
    updatedAt: addHours(today, 13)
  },
  {
    id: 'o3',
    tableId: 't4',
    tableName: '包间B1',
    playerName: '王总',
    playerPhone: '137****9012',
    startAt: addHours(today, 14),
    endAt: addHours(today, 20),
    status: 'active',
    createdAt: addHours(today, 12),
    updatedAt: addHours(today, 12)
  },
  {
    id: 'o4',
    tableId: 't1',
    tableName: '大厅A1',
    playerName: '陈先生',
    playerPhone: '136****3456',
    startAt: addHours(today, 9),
    endAt: addHours(today, 10),
    status: 'completed',
    createdAt: addHours(today, 9),
    updatedAt: addHours(today, 10)
  }
];

export const mockTiers: PricingTier[] = createDefaultTiers();

export const mockBoardGames: BoardGame[] = [
  {
    id: 'g1',
    name: '狼人杀',
    category: '社交推理',
    difficulty: 'medium',
    players: '6-12人',
    totalQty: 5,
    availableQty: 3,
    description: '经典社交推理游戏'
  },
  {
    id: 'g2',
    name: '卡坦岛',
    category: '策略经营',
    difficulty: 'medium',
    players: '3-4人',
    totalQty: 3,
    availableQty: 2,
    description: '资源交易与建设策略'
  },
  {
    id: 'g3',
    name: '大富翁',
    category: '家庭休闲',
    difficulty: 'easy',
    players: '2-8人',
    totalQty: 4,
    availableQty: 4,
    description: '经典地产经营游戏'
  },
  {
    id: 'g4',
    name: '璀璨宝石',
    category: '策略卡牌',
    difficulty: 'medium',
    players: '2-4人',
    totalQty: 2,
    availableQty: 1,
    description: '宝石交易策略游戏'
  },
  {
    id: 'g5',
    name: '三国杀',
    category: '卡牌对战',
    difficulty: 'hard',
    players: '5-10人',
    totalQty: 6,
    availableQty: 5,
    description: '历史卡牌策略游戏'
  },
  {
    id: 'g6',
    name: 'UNO',
    category: '家庭休闲',
    difficulty: 'easy',
    players: '2-10人',
    totalQty: 8,
    availableQty: 8,
    description: '欢乐纸牌游戏'
  },
  {
    id: 'g7',
    name: '山屋惊魂',
    category: '角色扮演',
    difficulty: 'hard',
    players: '3-6人',
    totalQty: 2,
    availableQty: 1,
    description: '恐怖探险合作游戏'
  },
  {
    id: 'g8',
    name: '马尼拉',
    category: '策略经营',
    difficulty: 'medium',
    players: '3-5人',
    totalQty: 2,
    availableQty: 2,
    description: '航运投机策略游戏'
  }
];

const mockRentals1: GameRental[] = [
  {
    id: 'gr1',
    gameId: 'g1',
    gameName: '狼人杀',
    billId: 'b1',
    rentedAt: addHours(today, 10),
    returnedAt: addHours(today, 14),
    status: 'returned'
  },
  {
    id: 'gr2',
    gameId: 'g4',
    gameName: '璀璨宝石',
    billId: 'b1',
    rentedAt: addHours(today, 11),
    returnedAt: addHours(today, 14),
    status: 'returned'
  }
];

const mockRentals2: GameRental[] = [
  {
    id: 'gr3',
    gameId: 'g5',
    gameName: '三国杀',
    billId: 'b2',
    rentedAt: addHours(today, 13),
    status: 'rented'
  }
];

export const mockBills: Bill[] = [
  {
    id: 'b1',
    orderNo: getOrderNo(),
    tableId: 't1',
    tableName: '大厅A1',
    playerName: '陈先生',
    playerPhone: '136****3456',
    occupancyIds: ['o4'],
    startAt: addHours(today, 9),
    endAt: addHours(today, 10),
    totalHours: 1,
    tableFee: 15,
    gameRentalFee: 0,
    discount: 0,
    totalAmount: 15,
    status: 'paid',
    pricingBreakdown: [
      { tierId: 'tier1', tierName: '首小时', tierRate: 15, hoursUsed: 1, subtotal: 15 }
    ],
    gameRentals: [],
    paidAt: addHours(today, 10),
    createdAt: addHours(today, 10),
    updatedAt: addHours(today, 10)
  },
  {
    id: 'b2',
    orderNo: getOrderNo(),
    tableId: 't1',
    tableName: '大厅A1',
    playerName: '张先生',
    playerPhone: '138****1234',
    occupancyIds: ['o1'],
    startAt: addHours(today, 10),
    endAt: 0,
    totalHours: 4,
    tableFee: 75,
    gameRentalFee: 0,
    discount: 0,
    totalAmount: 75,
    status: 'unpaid',
    pricingBreakdown: [
      { tierId: 'tier1', tierName: '首小时', tierRate: 15, hoursUsed: 1, subtotal: 15 },
      { tierId: 'tier2', tierName: '2-3小时', tierRate: 20, hoursUsed: 2, subtotal: 40 },
      { tierId: 'tier3', tierName: '4-5小时', tierRate: 25, hoursUsed: 1, subtotal: 25 }
    ],
    gameRentals: mockRentals2,
    createdAt: addHours(today, 10),
    updatedAt: now
  },
  {
    id: 'b3',
    orderNo: getOrderNo(),
    tableId: 't2',
    tableName: '大厅A2',
    playerName: '李小姐',
    playerPhone: '139****5678',
    occupancyIds: ['o2'],
    startAt: addHours(today, 13),
    endAt: 0,
    totalHours: 4,
    tableFee: 75,
    gameRentalFee: 0,
    discount: 5,
    totalAmount: 70,
    status: 'unpaid',
    pricingBreakdown: [
      { tierId: 'tier1', tierName: '首小时', tierRate: 15, hoursUsed: 1, subtotal: 15 },
      { tierId: 'tier2', tierName: '2-3小时', tierRate: 20, hoursUsed: 2, subtotal: 40 },
      { tierId: 'tier3', tierName: '4-5小时', tierRate: 25, hoursUsed: 1, subtotal: 25 }
    ],
    gameRentals: [],
    createdAt: addHours(today, 13),
    updatedAt: now
  },
  {
    id: 'b4',
    orderNo: getOrderNo(),
    tableId: 't4',
    tableName: '包间B1',
    playerName: '王总',
    playerPhone: '137****9012',
    occupancyIds: ['o3'],
    startAt: addHours(today, 14),
    endAt: 0,
    totalHours: 6,
    tableFee: 125,
    gameRentalFee: 0,
    discount: 0,
    totalAmount: 125,
    status: 'unpaid',
    pricingBreakdown: [
      { tierId: 'tier1', tierName: '首小时', tierRate: 15, hoursUsed: 1, subtotal: 15 },
      { tierId: 'tier2', tierName: '2-3小时', tierRate: 20, hoursUsed: 2, subtotal: 40 },
      { tierId: 'tier3', tierName: '4-5小时', tierRate: 25, hoursUsed: 2, subtotal: 50 },
      { tierId: 'tier4', tierName: '6小时以上', tierRate: 30, hoursUsed: 1, subtotal: 30 }
    ],
    gameRentals: [],
    createdAt: addHours(today, 14),
    updatedAt: now
  }
];
