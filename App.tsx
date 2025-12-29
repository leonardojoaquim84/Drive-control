
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, FuelEntry, AppState } from './types';
import FuelingForm from './components/FuelingForm';
import StatsDashboard from './components/StatsDashboard';
import { getFuelInsights } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('fueltrack_state');
    return saved ? JSON.parse(saved) : { vehicles: [], activeVehicleId: null };
  });

  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isAddingFuel, setIsAddingFuel] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('fueltrack_state', JSON.stringify(state));
  }, [state]);

  const activeVehicle = useMemo(() => 
    state.vehicles.find(v => v.id === state.activeVehicleId),
    [state.vehicles, state.activeVehicleId]
  );

  useEffect(() => {
    if (activeVehicle) {
      handleGetInsights();
    }
  }, [state.activeVehicleId]);

  const handleGetInsights = async () => {
    if (!activeVehicle) return;
    setIsInsightLoading(true);
    const insight = await getFuelInsights(activeVehicle);
    setAiInsight(insight);
    setIsInsightLoading(false);
  };

  const addVehicle = () => {
    if (!newVehicleName.trim()) return;
    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      name: newVehicleName,
      model: '',
      plate: '',
      entries: [],
    };
    setState(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, newVehicle],
      activeVehicleId: prev.activeVehicleId || newVehicle.id
    }));
    setNewVehicleName('');
    setIsAddingVehicle(false);
  };

  const addFuelEntry = (data: Omit<FuelEntry, 'id' | 'pricePerLiter' | 'efficiency'>) => {
    if (!state.activeVehicleId) return;

    const newEntry: FuelEntry = {
      ...data,
      id: Date.now().toString(),
      pricePerLiter: data.value / data.liters,
      efficiency: data.kmPartial / data.liters,
    };

    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === state.activeVehicleId 
          ? { ...v, entries: [newEntry, ...v.entries] } 
          : v
      )
    }));
    setIsAddingFuel(false);
  };

  const removeVehicle = (id: string) => {
    if (confirm('Deseja realmente remover este veículo?')) {
      setState(prev => ({
        ...prev,
        vehicles: prev.vehicles.filter(v => v.id !== id),
        activeVehicleId: prev.activeVehicleId === id ? (prev.vehicles[0]?.id || null) : prev.activeVehicleId
      }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">DriveControl <span className="text-blue-600">Pro</span></h1>
          <p className="text-gray-500 font-medium">controle total dos seus consumos e gastos</p>
        </div>
        <button 
          onClick={() => setIsAddingVehicle(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.02]"
        >
          <i className="fas fa-plus-circle"></i> Novo Veículo
        </button>
      </header>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 pb-2 border-b border-gray-200">
        {state.vehicles.map(vehicle => (
          <button
            key={vehicle.id}
            onClick={() => setState(prev => ({ ...prev, activeVehicleId: vehicle.id }))}
            className={`flex-shrink-0 px-6 py-3 rounded-t-2xl font-semibold transition-all flex items-center gap-3 ${
              state.activeVehicleId === vehicle.id 
                ? 'bg-white text-blue-600 border-t border-x border-gray-200 -mb-[1px] shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <i className="fas fa-car-side"></i>
            {vehicle.name}
          </button>
        ))}
        {state.vehicles.length === 0 && (
          <p className="text-gray-400 italic py-2">Nenhum veículo cadastrado.</p>
        )}
      </div>

      {activeVehicle ? (
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <StatsDashboard vehicle={activeVehicle} />

            {/* AI Insights Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <i className="fas fa-robot"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Insights da IA</h3>
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Análise de Performance</p>
                </div>
                <button 
                  onClick={handleGetInsights} 
                  disabled={isInsightLoading}
                  className="ml-auto text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <i className={`fas fa-sync-alt ${isInsightLoading ? 'animate-spin' : ''}`}></i>
                </button>
              </div>
              <div className="text-gray-700 leading-relaxed text-sm md:text-base whitespace-pre-line">
                {isInsightLoading ? (
                  <div className="flex flex-col gap-2">
                    <div className="h-4 bg-blue-100 rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-blue-100 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : aiInsight}
              </div>
            </div>

            {/* Recent History */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Histórico Recente</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 text-left">Data</th>
                      <th className="px-6 py-4 text-left">Combustível</th>
                      <th className="px-6 py-4 text-left">Média</th>
                      <th className="px-6 py-4 text-left">R$/L</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeVehicle.entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {new Date(entry.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            entry.fuelType === 'Gasolina' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {entry.fuelType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">
                          {entry.efficiency.toFixed(2)} km/l
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          R$ {entry.pricePerLiter.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {activeVehicle.entries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                          Nenhum abastecimento registrado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 text-2xl">
                <i className="fas fa-car-side"></i>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{activeVehicle.name}</h2>
              <p className="text-gray-500 text-sm mb-6">Informações do Veículo</p>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">Abastecimentos</span>
                  <span className="text-gray-900 font-bold">{activeVehicle.entries.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">Distância Estimada</span>
                  <span className="text-gray-900 font-bold">
                    {activeVehicle.entries.reduce((acc, curr) => acc + curr.kmPartial, 0)} km
                  </span>
                </div>
              </div>

              <button 
                onClick={() => removeVehicle(activeVehicle.id)}
                className="w-full py-3 text-red-500 text-sm font-semibold hover:bg-red-50 rounded-xl transition-colors"
              >
                Remover Veículo
              </button>
            </div>

            <button 
              onClick={() => setIsAddingFuel(true)}
              className="w-full bg-gray-900 text-white py-4 rounded-3xl font-bold shadow-xl hover:bg-black transition-all transform hover:-translate-y-1"
            >
              <i className="fas fa-gas-pump mr-2"></i> Novo Abastecimento
            </button>
          </div>
        </main>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="relative inline-block mb-6">
             <i className="fas fa-car-side text-6xl text-gray-200"></i>
             <i className="fas fa-plus absolute -top-2 -right-2 text-xl text-gray-300 bg-white rounded-full p-1 border border-gray-100"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Sem veículos ativos</h2>
          <p className="text-gray-500 mt-2">Adicione seu primeiro veículo para começar o monitoramento.</p>
          <button 
            onClick={() => setIsAddingVehicle(true)}
            className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            Adicionar Veículo
          </button>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddingVehicle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Novo Veículo</h3>
            <p className="text-gray-500 mb-6">Dê um nome ou apelido ao seu veículo.</p>
            <input
              type="text"
              value={newVehicleName}
              onChange={(e) => setNewVehicleName(e.target.value)}
              placeholder="Ex: Renegade Azul"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button 
                onClick={addVehicle}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
              <button 
                onClick={() => setIsAddingVehicle(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fuel Entry Modal */}
      {isAddingFuel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl animate-in slide-in-from-bottom-10 duration-300">
            <FuelingForm onSave={addFuelEntry} onCancel={() => setIsAddingFuel(false)} />
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      {activeVehicle && !isAddingFuel && (
        <button 
          onClick={() => setIsAddingFuel(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-400 flex items-center justify-center text-2xl lg:hidden hover:scale-110 active:scale-95 transition-all z-40"
        >
          <i className="fas fa-gas-pump"></i>
        </button>
      )}
    </div>
  );
};

export default App;