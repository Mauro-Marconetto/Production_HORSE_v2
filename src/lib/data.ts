import type { Machine, Mold, Piece, Demand, CurrentInventory, Production, Plan, PlanAssignment, PlaceholderImage } from './types';

export const placeholderImages: PlaceholderImage[] = [
    {
      "id": "login-background",
      "description": "A modern factory floor with machinery.",
      "imageUrl": "https://picsum.photos/seed/forgeflow-login/1920/1080",
      "imageHint": "factory industrial"
    }
  ]

export const machines: Machine[] = [
  { id: 'M01', nombre: 'Inyectora 500T', tonelaje: 500, turnosSemana: 15, horasTurno: 8, OEE_obj: 0.85, OEE_hist: 0.82 },
  { id: 'M02', nombre: 'Inyectora 800T', tonelaje: 800, turnosSemana: 15, horasTurno: 8, OEE_obj: 0.80, OEE_hist: 0.78 },
];

export const pieces: Piece[] = [
  { id: 'P1001', codigo: 'C-55-AX1', cliente: 'AutoCorp', peso: 1.2, familia: 'Soportes', stockMin: 2000, stockMax: 8000 },
  { id: 'P1002', codigo: 'C-55-AX2', cliente: 'AutoCorp', peso: 1.5, familia: 'Soportes', stockMin: 1500, stockMax: 6000 },
  { id: 'P2001', codigo: 'H-78-B1', cliente: 'HeavyDuty', peso: 3.4, familia: 'Carcasas', stockMin: 500, stockMax: 2500 },
];

export const molds: Mold[] = [
  { id: 'MOLD-01', nombre: 'Soporte V1', pieces: ['P1001'], cavidades: 2, compatibilidad: ['M01'], cicloBase_s: 45, setupMin: 240, vidaMaxTiros: 500000, tiempoRecambioMin: 120, status: 'ok' },
  { id: 'MOLD-02', nombre: 'Soporte V2', pieces: ['P1002'], cavidades: 2, compatibilidad: ['M01'], cicloBase_s: 55, setupMin: 260, vidaMaxTiros: 500000, tiempoRecambioMin: 130, status: 'ok' },
  { id: 'MOLD-03', nombre: 'Carcasa Grande', pieces: ['P2001'], cavidades: 1, compatibilidad: ['M02'], cicloBase_s: 120, setupMin: 480, vidaMaxTiros: 300000, tiempoRecambioMin: 240, status: 'mantenimiento' },
];

export const demands: Demand[] = [
  { id: '202426/P1001', periodoYYYYWW: '202426', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202426/P1002', periodoYYYYWW: '202426', pieceId: 'P1002', qty: 3000, prioridad: 1, version: 1, congelado: false },
  { id: '202426/P2001', periodoYYYYWW: '202426', pieceId: 'P2001', qty: 1000, prioridad: 2, version: 1, congelado: false },
  { id: '202427/P1001', periodoYYYYWW: '202427', pieceId: 'P1001', qty: 4200, prioridad: 1, version: 1, congelado: false },
  { id: '202427/P1002', periodoYYYYWW: '202427', pieceId: 'P1002', qty: 3100, prioridad: 1, version: 1, congelado: false },
  { id: '202427/P2001', periodoYYYYWW: '202427', pieceId: 'P2001', qty: 1100, prioridad: 2, version: 1, congelado: false },
];

export const inventory: CurrentInventory[] = [
    { pieceId: 'P1001', stock: 3500 },
    { pieceId: 'P1002', stock: 2800 },
    { pieceId: 'P2001', stock: 800 },
]

export const production: Production[] = [
    { id: '2024-06-24T08:00:00Z', fechaISO: '2024-06-24T08:00:00Z', machineId: 'M01', pieceId: 'P1001', moldId: 'MOLD-01', horas: 8, unidades: 1200, scrapPct: 0.03 },
    { id: '2024-06-24T16:00:00Z', fechaISO: '2024-06-24T16:00:00Z', machineId: 'M01', pieceId: 'P1001', moldId: 'MOLD-01', horas: 8, unidades: 1180, scrapPct: 0.04 },
    { id: '2024-06-24T08:00:00Z', fechaISO: '2024-06-24T08:00:00Z', machineId: 'M02', pieceId: 'P2001', moldId: 'MOLD-03', horas: 8, unidades: 230, scrapPct: 0.05 },
]

export const plans: Plan[] = [
    { id: 'run-001', createdAt: '2024-06-20T10:00:00Z', params: { oee: 0.8 }, status: 'published' },
    { id: 'run-002', createdAt: '2024-06-25T11:00:00Z', params: { oee: 0.85 }, status: 'draft' },
]

export const planAssignments: PlanAssignment[] = [
    { id: 'assign-1', planId: 'run-002', pieceId: 'P1001', moldId: 'MOLD-01', machineId: 'M01', semana: '202426', horas: 80, setup: true, prodUnidades: 12800 },
    { id: 'assign-2', planId: 'run-002', pieceId: 'P1002', moldId: 'MOLD-02', machineId: 'M01', semana: '202426', horas: 36, setup: true, prodUnidades: 4200 },
    { id: 'assign-3', planId: 'run-002', pieceId: 'P2001', moldId: 'MOLD-03', machineId: 'M02', semana: '202426', horas: 120, setup: true, prodUnidades: 3600 },
]
