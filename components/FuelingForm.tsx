
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
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Novo Abastecimento</h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Combustível</label>
          <select
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value as FuelType)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Gasolina">Gasolina</option>
            <option value="Álcool">Álcool</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">KM Total</label>
          <input
            type="number"
            value={kmTotal}
            onChange={(e) => setKmTotal(e.target.value)}
            placeholder="Ex: 45000"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">KM Parcial (Rodados)</label>
          <input
            type="number"
            value={kmPartial}
            onChange={(e) => setKmPartial(e.target.value)}
            placeholder="Ex: 450"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Valor Total (R$)</label>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ex: 250.00"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Litros</label>
          <input
            type="number"
            step="0.001"
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            placeholder="Ex: 45.5"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
        >
          Salvar Registro
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default FuelingForm;
