
export type FuelType = 'Gasolina' | 'Álcool';

export interface FuelEntry {
  id: string;
  date: string;
  kmTotal: number;
  kmPartial: number;
  fuelType: FuelType;
  value: number;
  liters: number;
  pricePerLiter: number;
  efficiency: number; // km/l
}

export type MaintenanceCategory = 
  | 'Troca de Óleo' 
  | 'Pneus' 
  | 'Freios' 
  | 'Suspensão' 
  | 'Motor' 
  | 'Elétrica' 
  | 'Filtros' 
  | 'Ar Condicionado' 
  | 'Estética/Limpeza'
  | 'Outros';

export interface MaintenanceEntry {
  id: string;
  date: string;
  description: string;
  category: MaintenanceCategory;
  km: number;
  value: number;
  type: 'Preventiva' | 'Corretiva';
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  model: string;
  color: string; // Hex color code
  photo?: string; // Base64 string for the vehicle image
  entries: FuelEntry[];
  maintenanceEntries: MaintenanceEntry[];
}

export interface AppState {
  vehicles: Vehicle[];
  activeVehicleId: string | null;
}

export interface User {
  username: string;
  photo?: string;
}

export interface UserAccount extends User {
  password: string;
}
