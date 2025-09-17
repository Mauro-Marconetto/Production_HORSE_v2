
export interface Piece {
  id: string;
  codigo: string;
  cliente: string;
  peso: number;
  familia: string;
  stockMin: number;
  stockMax: number;
  taktObjetivo?: number;
}

export interface Mold {
  id: string;
  nombre: string;
  pieces: string[];
  cavidades: number;
  compatibilidad: string[]; // machine IDs
  cicloBase_s: number;
  setupMin: number;
  vidaMaxTiros: number;
  tiempoRecambioMin: number;
  status: 'ok' | 'mantenimiento';
}

export interface Machine {
  id: string;
  nombre: string;
  tonelaje: number;
  turnosSemana: number;
  horasTurno: number;
  OEE_obj: number;
  OEE_hist?: number;
}

export interface Demand {
  id: string; // composite key {periodoYYYYWW}/{pieceId}
  periodoYYYYWW: string;
  pieceId: string;
  qty: number;
  prioridad: 1 | 2 | 3;
  version: number;
  congelado: boolean;
}

export interface Inventory {
  id: string; // composite key {pieceId}/{fechaISO}
  pieceId: string;
  fechaISO: string;
  stock: number;
}

export interface CurrentInventory {
    pieceId: string;
    stock: number;
}

export interface CalendarEvent {
  id: string;
  machineId: string;
  date: string; // YYYY-MM-DD
  type: 'feriado' | 'vacaciones' | 'mantenimiento' | 'arranque';
  description: string;
}


export interface Downtime {
  id: string; // composite key {machineId}/{YYYYMM}
  machineId: string;
  YYYYMM: string;
  minutos: number;
  categoria: string;
  causa?: string;
  plan: boolean;
  tryout: boolean;
}

export interface DowntimeAgg {
  id: string; // composite key {machineId}/{YYYYMM}
  machineId: string;
  YYYYMM: string;
  min_totales: number;
  min_planificados: number;
  min_no_plan: number;
  min_tryout: number;
}

export interface Plan {
  id: string; // runId
  createdAt: string;
  params: any;
  status: 'draft' | 'published';
}

export interface PlanAssignment {
  id:string; // autoId
  planId: string;
  pieceId: string;
  moldId: string;
  machineId: string;
  semana: string; // 'YYYYWW'
  horas: number;
  setup: boolean;
  prodUnidades: number;
}

export interface Production {
  id: string; 
  fechaISO: string;
  machineId: string;
  pieceId: string;
  moldId: string;
  horas: number;
  unidades: number;
  scrapPct: number;
}

export interface ScrapEntry {
    id: string;
    periodoYYYYMM: string;
    pieceId: string;
    qty: number;
    causa: string;
}

export interface Settings {
  ventana_meses: number;
  suavizado_alpha: number;
  cap_pct: number;
  minAvail: number;
  maxAvail: number;
}

export type PlaceholderImage = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
}
