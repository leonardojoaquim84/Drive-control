
import React, { useState } from 'react';
import { MaintenanceEntry, MaintenanceCategory } from '../types';

interface MaintenanceFormProps {
  onSave: (entry: Omit<MaintenanceEntry, 'id'>) => void;
  onCancel: () => void;
}

const CATEGORIES: MaintenanceCategory[] = [
  'Troca de Óleo', 'Pneus', 'Freios', 'Suspensão', 'Motor', 
  'Elétrica', 'Filtros', 'Ar Condicionado', 'Estética/Limpeza', 'Outros'
];

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ onSave, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('Outros');
  const [km, setKm] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<'Preventiva' | 'Corretiva'>('Preventiva');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !km || !value) return;
    
    onSave({
      date,
      description,
      category,
      km: parseFloat(km),
      value: parseFloat(value),
      type,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-black text-gray-900">Nova Manutenção</h3>
          <p className="text-gray-500 text-sm">Discrimine os gastos com oficina</p>
        </div>
        <button type="button" onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tipo de Serviço</label>
          <div className="flex p-1.5 bg-gray-100 rounded-2xl">
            {(['Preventiva', 'Corretiva'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  type === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
              className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição Detalhada</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Troca de pastilhas dianteiras marca X"
              className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">KM Atual</label>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="0"
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-semibold"
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
                className="w-full pl-12 pr-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900 text-lg"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <button type="submit" className="flex-[2] bg-gray-900 text-white py-5 rounded-3xl font-black text-lg shadow-xl hover:bg-black transition-all">
          Salvar Manutenção
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-3xl font-bold">
          Voltar
        </button>
      </div>
    </form>
  );
};

export default MaintenanceForm;
