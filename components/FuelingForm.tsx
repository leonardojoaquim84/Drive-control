
import React, { useState } from 'react';
import { FuelType, FuelEntry } from '../types';

interface FuelingFormProps {
  onSave: (entry: Omit<FuelEntry, 'id' | 'pricePerLiter' | 'efficiency'>) => void;
  onCancel: () => void;
}

const FuelingForm: React.FC<FuelingFormProps> = ({ onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [kmTotal, setKmTotal] = useState<string>('');
  const [kmPartial, setKmPartial] = useState<string>('');
  const [fuelType, setFuelType] = useState<FuelType>('Gasolina');
  const [value, setValue] = useState<string>('');
  const [liters, setLiters] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kmTotal || !kmPartial || !value || !liters) return;
    
    onSave({
      date,
      kmTotal: parseFloat(kmTotal),
      kmPartial: parseFloat(kmPartial),
      fuelType,
      value: parseFloat(value),
      liters: parseFloat(liters),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-black text-gray-900">Novo Abastecimento</h3>
          <p className="text-gray-500 text-sm">Insira os dados do posto</p>
        </div>
        <button type="button" onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="space-y-6">
        {/* Roleta de Combustível (Segmented Control) */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tipo de Combustível</label>
          <div className="flex p-1.5 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setFuelType('Gasolina')}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                fuelType === 'Gasolina' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              Gasolina
            </button>
            <button
              type="button"
              onClick={() => setFuelType('Álcool')}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                fuelType === 'Álcool' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              Álcool
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Data</label>
            <div className="relative">
              <i className="fas fa-calendar absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"></i>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Valor Total (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">KM Total Atual</label>
            <div className="relative">
              <i className="fas fa-tachometer-alt absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="number"
                value={kmTotal}
                onChange={(e) => setKmTotal(e.target.value)}
                placeholder="Ex: 45000"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">KM Parcial</label>
            <div className="relative">
              <i className="fas fa-road absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="number"
                value={kmPartial}
                onChange={(e) => setKmPartial(e.target.value)}
                placeholder="Ex: 450"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                required
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Quantidade de Litros</label>
            <div className="relative">
              <i className="fas fa-fill-drip absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="number"
                step="0.001"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="0.000"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold uppercase text-xs">Litros</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <button
          type="submit"
          className="flex-[2] bg-gray-900 text-white py-5 rounded-3xl font-black text-lg shadow-xl hover:bg-black transition-all active:scale-[0.98]"
        >
          Confirmar Registro
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-3xl font-bold hover:bg-gray-200 transition-all"
        >
          Voltar
        </button>
      </div>
    </form>
  );
};

export default FuelingForm;
