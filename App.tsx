
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, FuelEntry, AppState, User } from './types';
import FuelingForm from './components/FuelingForm';
import StatsDashboard from './components/StatsDashboard';
import { getFuelInsights } from './services/geminiService';

const PRESET_COLORS = [
  { name: 'Preto', hex: '#000000' },
  { name: 'Grafite', hex: '#4F4F4F' },
  { name: 'Vermelho Escuro', hex: '#8B0000' },
  { name: 'Azul Real', hex: '#2563eb' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Violeta', hex: '#7c3aed' },
  { name: 'Rosa Choque', hex: '#f43f5e' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Esmeralda', hex: '#10b981' },
];

const DEFAULT_USER: User = { username: 'Motorista' };

type ViewMode = 'home' | 'vehicle_detail';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('drivecontrol_user_profile');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const [state, setState] = useState<AppState>(() => {
    const savedData = localStorage.getItem('drivecontrol_db_v2');
    return savedData ? JSON.parse(savedData) : { vehicles: [], activeVehicleId: null };
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  // --- UI STATE ---
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [isAddingFuel, setIsAddingFuel] = useState(false);
  const [isManagingVehicles, setIsManagingVehicles] = useState(false);
  const [vehicleToDeleteId, setVehicleToDeleteId] = useState<string | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleColor, setNewVehicleColor] = useState(PRESET_COLORS[0].hex);
  const [editName, setEditName] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | undefined>(undefined);

  const [aiInsight, setAiInsight] = useState<string>('');
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingProfile(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('drivecontrol_db_v2', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('drivecontrol_user_profile', JSON.stringify(currentUser));
  }, [currentUser]);

  const activeVehicle = useMemo(() => 
    state.vehicles.find(v => v.id === state.activeVehicleId),
    [state.vehicles, state.activeVehicleId]
  );

  const globalStats = useMemo(() => {
    const totalSpent = state.vehicles.reduce((acc, v) => 
      acc + v.entries.reduce((vAcc, e) => vAcc + e.value, 0), 0);
    const totalLiters = state.vehicles.reduce((acc, v) => 
      acc + v.entries.reduce((vAcc, e) => vAcc + e.liters, 0), 0);
    return { totalSpent, totalLiters };
  }, [state.vehicles]);

  useEffect(() => {
    if (activeVehicle && activeVehicle.entries.length > 0) {
      handleGetInsights();
    } else {
      setAiInsight('');
    }
  }, [state.activeVehicleId, activeVehicle?.id]);

  const handleGetInsights = async () => {
    if (!activeVehicle || activeVehicle.entries.length === 0) return;
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
      color: newVehicleColor,
      entries: [],
    };
    setState(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, newVehicle],
      activeVehicleId: newVehicle.id
    }));
    setNewVehicleName('');
    setIsAddingVehicle(false);
    setViewMode('vehicle_detail');
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

  const removeFuelEntry = (entryId: string) => {
    if (!state.activeVehicleId) return;
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === state.activeVehicleId 
          ? { ...v, entries: v.entries.filter(e => e.id !== entryId) } 
          : v
      )
    }));
  };

  const executeRemoveVehicle = () => {
    if (!vehicleToDeleteId) return;
    setState(prev => {
      const remaining = prev.vehicles.filter(v => v.id !== vehicleToDeleteId);
      let newActiveId = prev.activeVehicleId;
      if (vehicleToDeleteId === prev.activeVehicleId) {
        setAiInsight('');
        newActiveId = remaining.length > 0 ? remaining[0].id : null;
      }
      return { ...prev, vehicles: remaining, activeVehicleId: newActiveId };
    });
    setVehicleToDeleteId(null);
    setViewMode('home');
  };

  const getUserInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Sincronizando Garagem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-10 flex items-start justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewMode('home')}>
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-100">
            <i className="fas fa-car-side"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">DriveControl <span className="text-blue-600">Pro</span></h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Painel de Controle</p>
          </div>
        </div>

        <div className="relative inline-block" ref={userMenuRef}>
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors group">
            <div className="w-12 h-12 bg-blue-600 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
              {currentUser.photo ? (
                <img src={currentUser.photo} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-base">{getUserInitials(currentUser.username)}</span>
              )}
            </div>
            <div className="pr-2 text-left hidden sm:block">
              <p className="text-[10px] font-black text-gray-900 leading-none">{currentUser.username}</p>
            </div>
            <i className={`fas fa-chevron-down text-[8px] text-gray-400 mr-2 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <button onClick={() => { setViewMode('home'); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3">
                <i className="fas fa-home text-blue-500 text-lg"></i> Início
              </button>
              <button onClick={() => window.open('https://wa.me/5521997391448', '_blank')} className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-t border-gray-50 transition-colors">
                <i className="fab fa-whatsapp text-lg"></i> Suporte
              </button>
            </div>
          )}
        </div>
      </header>

      {viewMode === 'home' ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32"></div>
             <div className="relative z-10">
               <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-2 tracking-tight">Olá, {currentUser.username}!</h2>
               <p className="text-gray-400 font-bold mb-10">Bem-vindo à sua central de controle veicular.</p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl shadow-blue-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Gasto Global</p>
                    <p className="text-3xl font-black">R$ {globalStats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div className="bg-gray-900 text-white p-6 rounded-[2rem] shadow-xl shadow-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Volume Total</p>
                    <p className="text-3xl font-black">{globalStats.totalLiters.toFixed(1)} <span className="text-sm">Litros</span></p>
                 </div>
               </div>
             </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-6 px-4">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Sua Garagem</h3>
              <button onClick={() => setIsAddingVehicle(true)} className="text-blue-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors">
                <i className="fas fa-plus-circle"></i> Novo Veículo
              </button>
            </div>
            {state.vehicles.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[3rem] p-16 text-center">
                <i className="fas fa-car-side text-4xl text-gray-200 mb-4"></i>
                <p className="text-gray-400 font-bold">Nenhum veículo cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {state.vehicles.map(v => (
                  <button key={v.id} onClick={() => { setState(s => ({...s, activeVehicleId: v.id})); setViewMode('vehicle_detail'); }} className="group bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-gray-50 flex-shrink-0">
                      {v.photo ? <img src={v.photo} className="w-full h-full object-cover" /> : <div style={{ backgroundColor: v.color }} className="w-full h-full flex items-center justify-center text-white text-2xl font-black">{getUserInitials(v.name)}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-lg font-black text-gray-900 truncate tracking-tight">{v.name}</h4>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v.plate || 'Sem Placa'}</p>
                    </div>
                    <i className="fas fa-chevron-right text-gray-200 group-hover:text-blue-500 transition-colors"></i>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : activeVehicle ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <button onClick={() => setViewMode('home')} className="flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors mb-2">
            <i className="fas fa-arrow-left"></i> Voltar ao Início
          </button>
          <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gray-50/50 rounded-full -mr-36 -mt-36"></div>
            <div className="relative z-10 w-full flex flex-col items-start gap-8">
              <div className="flex items-center gap-6 w-full">
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden border-8 border-gray-50 bg-white shadow-xl flex items-center justify-center">
                  {activeVehicle.photo ? <img src={activeVehicle.photo} className="w-full h-full object-cover" /> : <i className="fas fa-car-side text-4xl" style={{ color: activeVehicle.color }}></i>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-1 text-right">
                  <h2 className="text-3xl lg:text-4xl font-black text-gray-500 tracking-tighter leading-none">{activeVehicle.name}</h2>
                  <div className="bg-gray-100 text-gray-500 px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest font-mono shadow-sm mt-1">
                    {activeVehicle.plate || 'AAA 111'}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsAddingFuel(true)} style={{ backgroundColor: '#F4A460' }} className="w-full text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-gray-200">
                <i className="fas fa-gas-pump text-black"></i> Novo Abastecimento
              </button>
              <div className="w-full bg-blue-50/40 rounded-[2.5rem] p-8 border border-blue-100/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs shadow-md"><i className="fas fa-robot"></i></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">AI Drive Insight</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed font-bold italic">"{aiInsight || "Comece a abastecer para que eu possa analisar sua eficiência!"}"</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <button onClick={() => setIsStatsExpanded(!isStatsExpanded)} className="w-full bg-blue-50 text-blue-900 p-8 rounded-[2.5rem] font-black flex items-center justify-between">
              <span className="text-xl tracking-tighter">Análise de Dados</span>
              <i className={`fas fa-chevron-down transition-transform ${isStatsExpanded ? 'rotate-180' : ''}`}></i>
            </button>
            {isStatsExpanded && <StatsDashboard vehicle={activeVehicle} />}
            <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} className="w-full bg-blue-50 text-blue-900 p-8 rounded-[2.5rem] font-black flex items-center justify-between">
              <span className="text-xl tracking-tighter">Histórico de Abastecimentos</span>
              <i className={`fas fa-chevron-down transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`}></i>
            </button>
            {isHistoryExpanded && (
              <div className="space-y-4">
                {activeVehicle.entries.map(entry => (
                  <div key={entry.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-blue-600"><i className="fas fa-gas-pump"></i></div>
                      <div>
                        <p className="font-black text-gray-900">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(entry.date).toLocaleDateString('pt-BR')} • {entry.liters.toFixed(2)}L</p>
                      </div>
                    </div>
                    <button onClick={() => removeFuelEntry(entry.id)} className="w-10 h-10 rounded-xl bg-gray-50 text-red-400 flex items-center justify-center"><i className="fas fa-trash-alt"></i></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-8 flex justify-center">
            <button onClick={() => setVehicleToDeleteId(activeVehicle.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-trash-alt"></i> Remover Veículo
            </button>
          </div>
        </div>
      ) : null}

      {/* MODALS */}
      {isAddingVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-gray-900 tracking-tight">Novo Veículo</h3>
            <div className="space-y-4">
              <input type="text" autoFocus value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} placeholder="Apelido do veículo" className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none" />
              <div className="flex gap-4 pt-4">
                <button onClick={addVehicle} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">Criar</button>
                <button onClick={() => setIsAddingVehicle(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isAddingFuel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="max-w-xl w-full"><FuelingForm onSave={addFuelEntry} onCancel={() => setIsAddingFuel(false)} /></div>
        </div>
      )}
      {vehicleToDeleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center">
            <h3 className="text-3xl font-black text-gray-900 mb-4">Confirmar Exclusão?</h3>
            <p className="text-gray-500 font-bold mb-10">Você está prestes a remover este veículo permanentemente.</p>
            <div className="flex flex-col gap-3">
              <button onClick={executeRemoveVehicle} className="w-full bg-red-500 text-white py-5 rounded-[1.5rem] font-black">Sim, Deletar</button>
              <button onClick={() => setVehicleToDeleteId(null)} className="w-full bg-gray-100 text-gray-500 py-5 rounded-[1.5rem] font-black">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
