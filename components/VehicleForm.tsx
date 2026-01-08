
import React, { useState, useRef } from 'react';
import { Vehicle } from '../types';

interface VehicleFormProps {
  initialData?: Vehicle;
  onSave: (data: Partial<Vehicle>) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  { name: 'Azul Real', hex: '#2563eb' },
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Roxo', hex: '#8b5cf6' },
  { name: 'Preto', hex: '#111827' },
];

const VehicleForm: React.FC<VehicleFormProps> = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [plate, setPlate] = useState(initialData?.plate || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [color, setColor] = useState(initialData?.color || PRESET_COLORS[0].hex);
  const [photo, setPhoto] = useState(initialData?.photo || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({ name, plate, model, color, photo });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 max-w-md w-full animate-in zoom-in-95">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-black text-gray-900">{initialData ? 'Editar Veículo' : 'Novo Veículo'}</h3>
        <p className="text-gray-500 text-sm">Personalize as informações da sua máquina</p>
      </div>

      <div className="space-y-6">
        {/* Photo Upload Section */}
        <div className="flex flex-col items-center gap-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-28 h-28 rounded-[2rem] border-4 border-gray-50 shadow-xl cursor-pointer overflow-hidden flex items-center justify-center group relative"
            style={{ backgroundColor: photo ? 'transparent' : color }}
          >
            {photo ? (
              <img src={photo} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-black">{name.substring(0, 2).toUpperCase() || '??'}</span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <i className="fas fa-camera"></i>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
          >
            Alterar Foto
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nome do Veículo</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Meu SUV" 
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Placa</label>
              <input 
                type="text" 
                value={plate} 
                onChange={e => setPlate(e.target.value.toUpperCase())} 
                placeholder="ABC-1234" 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Modelo/Ano</label>
              <input 
                type="text" 
                value={model} 
                onChange={e => setModel(e.target.value)} 
                placeholder="Ex: 2024" 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cor de Identificação</label>
            <div className="flex justify-between px-2">
              {PRESET_COLORS.map(c => (
                <button 
                  key={c.hex} 
                  type="button"
                  onClick={() => setColor(c.hex)} 
                  className={`w-8 h-8 rounded-full border-4 transition-all ${color === c.hex ? 'border-gray-200 scale-125 shadow-lg' : 'border-transparent opacity-60'}`} 
                  style={{ backgroundColor: c.hex }} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        <button type="submit" className="flex-[2] bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all">
          {initialData ? 'Salvar Alterações' : 'Criar Veículo'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-bold">
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;
