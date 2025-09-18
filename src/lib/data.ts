
import type { Machine, Mold, Piece, Demand, CurrentInventory, Production, Plan, PlanAssignment, PlaceholderImage, ScrapEntry, CalendarEvent } from './types';

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
  { id: '202428/P1001', periodoYYYYWW: '202428', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202428/P1002', periodoYYYYWW: '202428', pieceId: 'P1002', qty: 3200, prioridad: 1, version: 1, congelado: false },
  { id: '202428/P2001', periodoYYYYWW: '202428', pieceId: 'P2001', qty: 1200, prioridad: 2, version: 1, congelado: false },
  { id: '202429/P1001', periodoYYYYWW: '202429', pieceId: 'P1001', qty: 4500, prioridad: 1, version: 1, congelado: false },
  { id: '202429/P1002', periodoYYYYWW: '202429', pieceId: 'P1002', qty: 2800, prioridad: 1, version: 1, congelado: false },
  { id: '202429/P2001', periodoYYYYWW: '202429', pieceId: 'P2001', qty: 1000, prioridad: 2, version: 1, congelado: false },
  { id: '202430/P1001', periodoYYYYWW: '202430', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202431/P1001', periodoYYYYWW: '202431', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202432/P1001', periodoYYYYWW: '202432', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202433/P1001', periodoYYYYWW: '202433', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202434/P1001', periodoYYYYWW: '202434', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202435/P1001', periodoYYYYWW: '202435', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202436/P1001', periodoYYYYWW: '202436', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
  { id: '202437/P1001', periodoYYYYWW: '202437', pieceId: 'P1001', qty: 4000, prioridad: 1, version: 1, congelado: false },
];

export const inventory: CurrentInventory[] = [
    { pieceId: 'P1001', stock: 3500 },
    { pieceId: 'P1002', stock: 2800 },
    { pieceId: 'P2001', stock: 800 },
]

export const production: Production[] = [
    { id: 'prod-1', fechaISO: '2024-06-24T08:00:00Z', machineId: 'M01', pieceId: 'P1001', moldId: 'MOLD-01', horas: 8, unidades: 1200, scrapPct: 0.03 },
    { id: 'prod-2', fechaISO: '2024-06-24T16:00:00Z', machineId: 'M01', pieceId: 'P1001', moldId: 'MOLD-01', horas: 8, unidades: 1180, scrapPct: 0.04 },
    { id: 'prod-3', fechaISO: '2024-06-25T08:00:00Z', machineId: 'M02', pieceId: 'P2001', moldId: 'MOLD-03', horas: 8, unidades: 230, scrapPct: 0.05 },
    { id: 'prod-4', fechaISO: '2024-06-25T16:00:00Z', machineId: 'M02', pieceId: 'P2001', moldId: 'MOLD-03', horas: 8, unidades: 235, scrapPct: 0.02 },
]

export const plans: Plan[] = [
    { id: 'run-001', createdAt: '2024-06-20T10:00:00Z', params: { oee: 0.8 }, status: 'published' },
    { id: 'run-002', createdAt: '2024-06-25T11:00:00Z', params: { oee: 0.85 }, status: 'draft' },
]

export const planAssignments: PlanAssignment[] = [
    // Semana 27
    { id: 'assign-1', planId: 'run-002', pieceId: 'P1001', moldId: 'MOLD-01', machineId: 'M01', semana: '202427', horas: 40, setup: true, prodUnidades: 6400 },
    { id: 'assign-2', planId: 'run-002', pieceId: 'P1002', moldId: 'MOLD-02', machineId: 'M01', semana: '202427', horas: 40, setup: true, prodUnidades: 5200 },
    { id: 'assign-3', planId: 'run-002', pieceId: 'P2001', moldId: 'MOLD-03', machineId: 'M02', semana: '202427', horas: 60, setup: true, prodUnidades: 1800 },
    
    // Semana 28
    { id: 'assign-4', planId: 'run-002', pieceId: 'P1001', moldId: 'MOLD-01', machineId: 'M01', semana: '202428', horas: 50, setup: false, prodUnidades: 8000 },
    { id: 'assign-5', planId: 'run-002', pieceId: 'P2001', moldId: 'MOLD-03', machineId: 'M02', semana: '202428', horas: 60, setup: false, prodUnidades: 1800 },
    
    // Semana 29
    { id: 'assign-6', planId: 'run-002', pieceId: 'P1002', moldId: 'MOLD-02', machineId: 'M01', semana: '202429', horas: 80, setup: true, prodUnidades: 10400 },
    { id: 'assign-7', planId: 'run-002', pieceId: 'P2001', moldId: 'MOLD-03', machineId: 'M02', semana: '202429', horas: 40, setup: false, prodUnidades: 1200 },

    // Semana 30
    { id: 'assign-8', planId: 'run-002', pieceId: 'P1001', moldId: 'MOLD-01', machineId: 'M01', semana: '202430', horas: 60, setup: true, prodUnidades: 9600 },
]

export const scrap: ScrapEntry[] = [
    { id: 'scrap-1', periodoYYYYMM: '202405', pieceId: 'P1001', qty: 350, causa: 'Porosidad' },
    { id: 'scrap-2', periodoYYYYMM: '202405', pieceId: 'P1002', qty: 150, causa: 'Rebaba Excesiva' },
    { id: 'scrap-3', periodoYYYYMM: '202405', pieceId: 'P2001', qty: 75, causa: 'Marcas de Expulsión' },
    { id: 'scrap-4', periodoYYYYMM: '202406', pieceId: 'P1001', qty: 410, causa: 'Porosidad' },
];

export const calendarEvents: CalendarEvent[] = [
    { id: 'evt-1', machineId: "all", date: '2024-07-25', type: 'mantenimiento', description: 'Mantenimiento preventivo semestral' },
    { id: 'evt-3', machineId: "all", date: '2024-08-15', type: 'feriado', description: 'Asunción de la Virgen' },
]

