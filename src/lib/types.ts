






export interface Client {
  id: string;
  nombre: string;
}

export interface Piece {
  id: string;
  codigo: string;
  clienteId: string;
  stockMin?: number;
  stockMax?: number;
  requiereGranallado?: boolean;
  requiereMecanizado?: boolean;
  tiempoDeCiclo?: number;
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

export interface ProductionAssignment {
    id: string; // Unique ID for the assignment itself
    moldId?: string; // For injection machines
    pieceId?: string; // For other types of machines like shot blasting
    startDate: string; // ISO Date string
    endDate: string; // ISO Date string
}


export interface Machine {
  id: string;
  nombre: string;
  tonelaje: number;
  turnosSemana: number;
  horasTurno: number;
  OEE_obj: number;
  OEE_hist?: number;
  assignments?: ProductionAssignment[];
  type: 'inyectora' | 'granalladora';
  produccionHora: number;
}

export interface ProductionCapacity {
    machineId: string;
    pieceId: string;
    moldId: string;
    produccionHora: number;
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
  id: string; // Same as pieceId
  stockInyectado?: number; // sin prensar
  stockEnMecanizado?: number; // en proveedor externo
  stockMecanizado?: number; // retornado de proveedor
  stockGranallado?: number; // granallado
  stockListo?: number; // listo para entregar
  stockPendienteCalidad?: number; // segregado y esperando inspeccion
  stockEnsamblado?: number; // Ensamblado y listo para entregar
}


export interface CurrentInventory {
    pieceId: string;
    stock: number;
}

export interface CalendarEvent {
  id: string;
  machineId: string; // "all" for global events
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
  turno: 'mañana' | 'tarde' | 'noche' | '';
  qtyFinalizada: number;
  qtySinPrensar: number;
  qtyScrap: number; 
  qtyArranque?: number;
  createdBy?: string; // UID of user who declared production
  lastEditedBy?: string; // UID of user who last edited
  subproceso?: 'mecanizado' | 'granallado';

  // Machining specific fields
  qtyMecanizada?: number;
  qtyEnsamblada?: number;
  qtyScrapMecanizado?: number;
  qtyScrapEnsamblado?: number;
}

export interface QualityLot {
  id: string;
  createdAt: string;
  createdBy: string;
  
  // Segregation Info
  pieceId: string;
  machineId: string; // Can be 'mecanizado-externo' or a machine id
  moldId?: string;
  turno: 'mañana' | 'tarde' | 'noche' | '';
  nroRack: string;
  defecto: string;
  defectoOtro?: string;
  tipoControl: string;
  qtySegregada: number;
  
  // Inspection Info
  status: 'pending' | 'inspected';
  inspectionDate?: string;
  inspectedBy?: string;
  qtyAptaCalidad?: number;
  qtyAptaSinPrensarCalidad?: number;
  qtyScrapCalidad?: number;
}


export interface ScrapEntry {
    id: string;
    periodoYYYYMM: string;
    pieceId: string;
    qty: number;
    causa: string;
}

export interface SubprocessEntry {
  id: string;
  pieceId: string;
  proceso: 'mecanizado' | 'granallado';
  qty: number;
  proveedor: string;
  fechaEnvio: string;
  fechaRetorno?: string;
  status: 'pendiente' | 'validacion' | 'finalizada' | 'segregada';
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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Role {
    id: string;
    name: string;
    allowedRoutes: string[];
}

export interface Supplier {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string;
}

export interface RemitoItem {
  pieceId: string;
  qty: number;
}

export interface Remito {
  id: string;
  numero?: number;
  fecha: string; // ISO Date
  supplierId: string;
  transportista: string;
  transportistaCuit?: string;
  vehiculo?: string;
  status: 'enviado' | 'en_proceso' | 'retornado_parcial' | 'retornado_completo';
  items: RemitoItem[];
}

export interface RemitoSettings {
  nextRemitoNumber: number;
  cai: string;
  caiExpiration: string; // ISO Date string
}


export interface MachiningProcess {
  id: string;
  remitoId: string;
  pieceId: string;
  qtyEnviada: number;
  status: 'Enviado' | 'En Proceso' | 'Finalizado';
  
  // Quantities declared during the process
  qtyMecanizada?: number;
  qtyEnsamblada?: number;
  qtySegregada?: number;
  qtyScrap?: number;
  qtyScrapMecanizado?: number;
  qtyScrapEnsamblado?: number;
}

export interface Export {
  id: string;
  clientId: string;
  pieceId: string;
  qty: number;
  origenStock: 'stockListo' | 'stockEnsamblado';
  fecha: string; // ISO Date
}
