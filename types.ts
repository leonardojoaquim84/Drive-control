
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

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  model: string;
  entries: FuelEntry[];
}

export interface AppState {
  vehicles: Vehicle[];
  activeVehicleId: string | null;
}
