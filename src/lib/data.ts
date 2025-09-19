

import type { Machine, Mold, Piece, Demand, CurrentInventory, Production, Plan, PlanAssignment, PlaceholderImage, ScrapEntry, CalendarEvent, Client, ProductionCapacity, MachiningEntry } from './types';

export const placeholderImages: PlaceholderImage[] = [
    {
      "id": "login-background",
      "description": "A modern factory floor with machinery.",
      "imageUrl": "/login-background.jpg",
      "imageHint": "factory industrial"
    }
  ]

export const machines: Machine[] = [
  { id: 'M01', nombre: 'Colosio 2000', tonelaje: 2000, turnosSemana: 15, horasTurno: 8, OEE_obj: 0.85, OEE_hist: 0.82 },
  { id: 'M02', nombre: 'Colosio 1600', tonelaje: 1600, turnosSemana: 15, horasTurno: 8, OEE_obj: 0.80, OEE_hist: 0.78 },
];

export const clients: Client[] = [
    { id: 'C01', nombre: 'AutoCorp' },
    { id: 'C02', nombre: 'HeavyDuty' },
    { id: 'C03', nombre: 'InduGeneral' },
]

export const pieces: Piece[] = [
  { id: 'P1001', codigo: '602', clienteId: 'C01', peso: 1.2, familia: 'Soportes', stockMin: 2000, stockMax: 8000 },
  { id: 'P1002', codigo: '602', clienteId: 'C01', peso: 1.5, familia: 'Soportes', stockMin: 1500, stockMax: 6000 },
  { id: 'P2001', codigo: '267', clienteId: 'C02', peso: 3.4, familia: 'Carcasas', stockMin: 500, stockMax: 2500 },
  { id: 'P2002', codigo: '267', clienteId: 'C02', peso: 2.1, familia: 'Carcasas', stockMin: 600, stockMax: 3000 },
  { id: 'P2003', codigo: '267', clienteId: 'C02', peso: 2.3, familia: 'Carcasas', stockMin: 700, stockMax: 3500 },
  { id: 'P3001', codigo: '729', clienteId: 'C03', peso: 0.8, familia: 'Engranajes', stockMin: 3000, stockMax: 12000 },
  { id: 'P3002', codigo: '729', clienteId: 'C03', peso: 0.9, familia: 'Engranajes', stockMin: 3000, stockMax: 12000 },
  { id: 'P3003', codigo: '729', clienteId: 'C03', peso: 1.0, familia: 'Engranajes', stockMin: 3000, stockMax: 12000 },
  { id: 'P4001', codigo: '243R', clienteId: 'C01', peso: 4.1, familia: 'Componentes Motor', stockMin: 400, stockMax: 1600 },
  { id: 'P4002', codigo: '243R', clienteId: 'C01', peso: 4.5, familia: 'Componentes Motor', stockMin: 400, stockMax: 1600 },
  { id: 'P5001', codigo: '774R', clienteId: 'C02', peso: 5.2, familia: 'Estructurales', stockMin: 300, stockMax: 1200 },
  { id: 'P5002', codigo: '774R', clienteId: 'C02', peso: 5.5, familia: 'Estructurales', stockMin: 300, stockMax: 1200 },
  { id: 'P5003', codigo: '774R', clienteId: 'C02', peso: 5.8, familia: 'Estructurales', stockMin: 300, stockMax: 1200 },
];

export const molds: Mold[] = [
  { id: 'MOLD-01', nombre: '32.2', pieces: ['P1001'], cavidades: 2, compatibilidad: ['M01'], cicloBase_s: 45, setupMin: 240, vidaMaxTiros: 500000, tiempoRecambioMin: 120, status: 'ok' },
  { id: 'MOLD-02', nombre: '21.2', pieces: ['P1002'], cavidades: 2, compatibilidad: ['M01'], cicloBase_s: 55, setupMin: 260, vidaMaxTiros: 500000, tiempoRecambioMin: 130, status: 'ok' },
  { id: 'MOLD-03', nombre: '38.2', pieces: ['P2001'], cavidades: 1, compatibilidad: ['M02'], cicloBase_s: 120, setupMin: 480, vidaMaxTiros: 300000, tiempoRecambioMin: 240, status: 'mantenimiento' },
  { id: 'MOLD-04', nombre: '45.2', pieces: ['P2002'], cavidades: 1, compatibilidad: ['M01'], cicloBase_s: 110, setupMin: 450, vidaMaxTiros: 300000, tiempoRecambioMin: 220, status: 'ok' },
  { id: 'MOLD-05', nombre: '51.1', pieces: ['P2003'], cavidades: 1, compatibilidad: ['M01'], cicloBase_s: 130, setupMin: 500, vidaMaxTiros: 300000, tiempoRecambioMin: 260, status: 'ok' },
  { id: 'MOLD-06', nombre: '42.2', pieces: ['P3001'], cavidades: 2, compatibilidad: ['M01', 'M02'], cicloBase_s: 60, setupMin: 300, vidaMaxTiros: 400000, tiempoRecambioMin: 150, status: 'ok' },
  { id: 'MOLD-07', nombre: '43.2', pieces: ['P3002'], cavidades: 2, compatibilidad: ['M01', 'M02'], cicloBase_s: 62, setupMin: 310, vidaMaxTiros: 400000, tiempoRecambioMin: 155, status: 'ok' },
  { id: 'MOLD-08', nombre: '44.1', pieces: ['P3003'], cavidades: 2, compatibilidad: ['M01', 'M02'], cicloBase_s: 65, setupMin: 320, vidaMaxTiros: 400000, tiempoRecambioMin: 160, status: 'ok' },
  { id: 'MOLD-09', nombre: '53.1', pieces: ['P4001'], cavidades: 1, compatibilidad: ['M01', 'M02'], cicloBase_s: 150, setupMin: 600, vidaMaxTiros: 250000, tiempoRecambioMin: 300, status: 'ok' },
  { id: 'MOLD-10', nombre: '57.1', pieces: ['P4002'], cavidades: 1, compatibilidad: ['M01', 'M02'], cicloBase_s: 160, setupMin: 620, vidaMaxTiros: 250000, tiempoRecambioMin: 310, status: 'ok' },
  { id: 'MOLD-11', nombre: '55.1', pieces: ['P5001'], cavidades: 1, compatibilidad: ['M01', 'M02'], cicloBase_s: 180, setupMin: 700, vidaMaxTiros: 200000, tiempoRecambioMin: 350, status: 'ok' },
  { id: 'MOLD-12', nombre: '59.1', pieces: ['P5002'], cavidades: 1, compatibilidad: ['M01', 'M02'], cicloBase_s: 190, setupMin: 720, vidaMaxTiros: 200000, tiempoRecambioMin: 360, status: 'ok' },
  { id: 'MOLD-13', nombre: '61.1', pieces: ['P5003'], cavidades: 1, compatibilidad: ['M01', 'M02'], cicloBase_s: 200, setupMin: 750, vidaMaxTiros: 200000, tiempoRecambioMin: 375, status: 'ok' },
];

export const productionCapacities: ProductionCapacity[] = [
    // Colosio 2000 (M01) - Assuming 24h operation for calculation from daily
    { machineId: 'M01', pieceId: 'P1001', moldId: 'MOLD-01', produccionHora: 31 },
    { machineId: 'M01', pieceId: 'P1002', moldId: 'MOLD-02', produccionHora: 31 },
    { machineId: 'M01', pieceId: 'P2001', moldId: 'MOLD-03', produccionHora: 31 }, // Asumiendo, aunque el molde 03 era M02
    { machineId: 'M01', pieceId: 'P2002', moldId: 'MOLD-04', produccionHora: 31 },
    { machineId: 'M01', pieceId: 'P2003', moldId: 'MOLD-05', produccionHora: 31 },
    { machineId: 'M01', pieceId: 'P3001', moldId: 'MOLD-06', produccionHora: 35 },
    { machineId: 'M01', pieceId: 'P3002', moldId: 'MOLD-07', produccionHora: 35 },
    { machineId: 'M01', pieceId: 'P3003', moldId: 'MOLD-08', produccionHora: 35 },
    { machineId: 'M01', pieceId: 'P4001', moldId: 'MOLD-09', produccionHora: 27 },
    { machineId: 'M01', pieceId: 'P4002', moldId: 'MOLD-10', produccionHora: 27 },
    { machineId: 'M01', pieceId: 'P5001', moldId: 'MOLD-11', produccionHora: 27 },
    { machineId: 'M01', pieceId: 'P5002', moldId: 'MOLD-12', produccionHora: 27 },
    { machineId: 'M01', pieceId: 'P5003', moldId: 'MOLD-13', produccionHora: 27 },

    // Colosio 1600 (M02)
    { machineId: 'M02', pieceId: 'P3001', moldId: 'MOLD-06', produccionHora: 35 },
    { machineId: 'M02', pieceId: 'P3002', moldId: 'MOLD-07', produccionHora: 35 },
    { machineId: 'M02', pieceId: 'P3003', moldId: 'MOLD-08', produccionHora: 35 },
    { machineId: 'M02', pieceId: 'P4001', moldId: 'MOLD-09', produccionHora: 27 },
    { machineId: 'M02', pieceId: 'P4002', moldId: 'MOLD-10', produccionHora: 27 },
    { machineId: 'M02', pieceId: 'P5001', moldId: 'MOLD-11', produccionHora: 27 },
    { machineId: 'M02', pieceId: 'P5002', moldId: 'MOLD-12', produccionHora: 27 },
    { machineId: 'M02', pieceId: 'P5003', moldId: 'MOLD-13', produccionHora: 27 },
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

export const machining: MachiningEntry[] = [
    { id: 'mach-1', pieceId: 'P4001', qty: 350, proveedor: 'Mecanizados Precisos S.L.', fechaEnvio: '2024-07-01', status: 'pendiente' },
    { id: 'mach-2', pieceId: 'P4002', qty: 350, proveedor: 'Mecanizados Precisos S.L.', fechaEnvio: '2024-07-01', status: 'pendiente' },
    { id: 'mach-3', pieceId: 'P5001', qty: 280, proveedor: 'TornoTech', fechaEnvio: '2024-06-28', status: 'validacion' },
    { id: 'mach-4', pieceId: 'P5002', qty: 280, proveedor: 'TornoTech', fechaEnvio: '2024-06-20', fechaRetorno: '2024-06-27', status: 'finalizada' },
    { id: 'mach-5', pieceId: 'P5003', qty: 300, proveedor: 'TornoTech', fechaEnvio: '2024-06-15', fechaRetorno: '2024-06-22', status: 'finalizada' },
    { id: 'mach-6', pieceId: 'P4001', qty: 25, proveedor: 'Mecanizados Precisos S.L.', fechaEnvio: '2024-06-25', status: 'segregada' },
];
    
