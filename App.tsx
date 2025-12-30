
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

const App: React.FC = () => {
  // --- PERSISTENCE ---
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('drivecontrol_user_profile');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const [state, setState] = useState<AppState>(() => {
    const savedData = localStorage.getItem('drivecontrol_db_v2');
    return savedData ? JSON.parse(savedData) : { vehicles: [], activeVehicleId: null };
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('drivecontrol_db_v2', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('drivecontrol_user_profile', JSON.stringify(currentUser));
  }, [currentUser]);

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    setCurrentUser({ username: profileName, photo: profilePhoto });
    setIsEditingProfile(false);
  };

  const activeVehicle = useMemo(() => 
    state.vehicles.find(v => v.id === state.activeVehicleId),
    [state.vehicles, state.activeVehicleId]
  );

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
      activeVehicleId: prev.activeVehicleId || newVehicle.id
    }));
    setNewVehicleName('');
    setIsAddingVehicle(false);
  };

  const saveEditVehicle = () => {
    if (!state.activeVehicleId) return;
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === state.activeVehicleId 
          ? { ...v, name: editName, plate: editPlate, photo: editPhoto, color: editColor } 
          : v
      )
    }));
    setIsEditingVehicle(false);
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

  const updateFuelEntry = (data: Omit<FuelEntry, 'id' | 'pricePerLiter' | 'efficiency'>) => {
    if (!state.activeVehicleId || !editingEntry) return;
    const updatedEntry: FuelEntry = {
      ...data,
      id: editingEntry.id,
      pricePerLiter: data.value / data.liters,
      efficiency: data.kmPartial / data.liters,
    };
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === state.activeVehicleId 
          ? { ...v, entries: v.entries.map(e => e.id === editingEntry.id ? updatedEntry : e) } 
          : v
      )
    }));
    setEditingEntry(null);
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
      
      return {
        ...prev,
        vehicles: remaining,
        activeVehicleId: newActiveId
      };
    });

    setVehicleToDeleteId(null);
    setIsManagingVehicles(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfilePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

  const triggerEditVehicle = (vehicle: Vehicle) => {
    setState(prev => ({ ...prev, activeVehicleId: vehicle.id }));
    setEditName(vehicle.name);
    setEditPlate(vehicle.plate);
    setEditColor(vehicle.color);
    setEditPhoto(vehicle.photo);
    setIsEditingVehicle(true);
    setIsManagingVehicles(false);
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
      {/* Header com Perfil no Canto Superior Direito */}
      <header className="mb-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-100">
            <i className="fas fa-car-side"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">DriveControl <span className="text-blue-600">Pro</span></h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Painel de Controle</p>
          </div>
        </div>

        {/* User profile button */}
        <div className="relative inline-block" ref={userMenuRef}>
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors group">
            <div className="w-12 h-12 bg-blue-600 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
              {currentUser.photo ? (
                <img src={currentUser.photo} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-base">
                  {getUserInitials(currentUser.username)}
                </span>
              )}
            </div>
            <div className="pr-2 text-left hidden sm:block">
              <p className="text-[10px] font-black text-gray-900 leading-none">{currentUser.username}</p>
            </div>
            <i className={`fas fa-chevron-down text-[8px] text-gray-400 mr-2 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>
          
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
               <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-50 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-inner">
                  {currentUser.photo ? <img src={currentUser.photo} className="w-full h-full object-cover rounded-full" /> : getUserInitials(currentUser.username)}
                </div>
                <div className="truncate">
                  <p className="text-xs font-black text-gray-900 truncate">{currentUser.username}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Meu Perfil</p>
                </div>
              </div>
              
              <button onClick={() => { setIsManagingVehicles(true); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                <i className="fas fa-car text-blue-500 text-lg"></i> Meus Veículos
              </button>

              <button onClick={() => { setIsEditingProfile(true); setIsUserMenuOpen(false); setProfileName(currentUser.username); setProfilePhoto(currentUser.photo); }} className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors border-t border-gray-50">
                <i className="fas fa-user-circle text-gray-400 text-lg"></i> Editar Perfil
              </button>
              
              <button onClick={() => window.open('https://wa.me/5521997391448', '_blank')} className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-t border-gray-50 transition-colors">
                <i className="fab fa-whatsapp text-lg"></i> Falar com o desenvolvedor
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs - Use vehicle color when active */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto no-scrollbar pb-2">
        {state.vehicles.map(vehicle => (
          <button
            key={vehicle.id}
            onClick={() => setState(prev => ({ ...prev, activeVehicleId: vehicle.id }))}
            style={state.activeVehicleId === vehicle.id ? { backgroundColor: vehicle.color } : {}}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
              state.activeVehicleId === vehicle.id 
              ? 'text-white shadow-xl scale-105' 
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <i className="fas fa-car text-xs"></i>
            {vehicle.name}
          </button>
        ))}
        <button
          onClick={() => setIsAddingVehicle(true)}
          className="flex-shrink-0 px-6 py-3 font-black text-sm text-blue-600 bg-white border-2 border-dashed border-blue-200 rounded-2xl flex items-center gap-2 hover:bg-blue-50 transition-colors"
        >
          <i className="fas fa-plus-circle"></i>
          Novo Veículo
        </button>
      </div>

      {activeVehicle ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Vehicle Card */}
          <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gray-50/50 rounded-full -mr-36 -mt-36 -z-0"></div>
            
            <div className="relative z-10 w-full flex flex-col items-start gap-8">
              {/* Header Info Row: Image + (Name & Plate Column) */}
              <div className="flex items-center gap-6 w-full">
                <div 
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden border-8 border-gray-50 bg-white flex items-center justify-center shadow-xl group cursor-pointer relative flex-shrink-0"
                  onClick={() => { setIsEditingVehicle(true); setEditName(activeVehicle.name); setEditPlate(activeVehicle.plate); setEditColor(activeVehicle.color); setEditPhoto(activeVehicle.photo); }}
                >
                  {activeVehicle.photo ? (
                    <img src={activeVehicle.photo} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-car-side text-4xl text-gray-100" style={{ color: activeVehicle.color + '33' }}></i>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <i className="fas fa-camera"></i>
                  </div>
                </div>

                {/* Vertical Stack for Name and Plate - Aligned to the RIGHT */}
                <div className="flex flex-col items-end gap-1 flex-1 text-right">
                  <h2 className="text-3xl lg:text-4xl font-black text-gray-500 tracking-tighter leading-none">{activeVehicle.name}</h2>
                  {/* Plate Badge - Gray color, stacked below name */}
                  <div 
                    className="bg-gray-100 text-gray-500 px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest font-mono shadow-sm mt-1"
                  >
                    {activeVehicle.plate || 'AAA 111'}
                  </div>
                </div>
              </div>

              <div className="w-full">
                <div className="mb-4">
                  {/* New Fueling Button - Full Width and Fixed color #F4A460 and BLACK icon */}
                  <button 
                    onClick={() => setIsAddingFuel(true)} 
                    style={{ backgroundColor: '#F4A460' }}
                    className="w-full text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-gray-200 hover:brightness-95 transition-all active:scale-95"
                  >
                    <i className="fas fa-gas-pump text-black"></i> Novo Abastecimento
                  </button>
                </div>
              </div>

              {/* AI Insight Section */}
              <div className="w-full bg-blue-50/40 rounded-[2.5rem] p-8 border border-blue-100/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs shadow-md">
                    <i className="fas fa-robot"></i>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">AI Drive Insight</span>
                </div>
                {isInsightLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-blue-100/50 rounded-full w-full animate-pulse"></div>
                    <div className="h-3 bg-blue-100/50 rounded-full w-4/5 animate-pulse"></div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed font-bold italic">
                    "{aiInsight || "Comece a abastecer para que eu possa analisar sua eficiência e te dar as melhores dicas!"}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Data Analysis Section */}
          <div className="space-y-4">
            <button 
              onClick={() => { setIsStatsExpanded(!isStatsExpanded); if (isHistoryExpanded) setIsHistoryExpanded(false); }}
              className="w-full bg-blue-50 text-blue-900 p-8 rounded-[2.5rem] font-black flex items-center justify-between transition-all hover:bg-blue-100 active:scale-[0.99] shadow-sm border border-blue-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center shadow-lg">
                  <i className="fas fa-chart-line text-sm"></i>
                </div>
                <span className="text-xl tracking-tighter">Análise de Dados</span>
              </div>
              <i className={`fas fa-chevron-down text-blue-400 transition-transform duration-300 ${isStatsExpanded ? 'rotate-180' : ''}`}></i>
            </button>

            {isStatsExpanded && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <StatsDashboard vehicle={activeVehicle} />
              </div>
            )}
          </div>

          {/* Expandable Fueling History Section */}
          <div className="space-y-4">
            <button 
              onClick={() => { setIsHistoryExpanded(!isHistoryExpanded); if (isStatsExpanded) setIsStatsExpanded(false); }}
              className="w-full bg-blue-50 text-blue-900 p-8 rounded-[2.5rem] font-black flex items-center justify-between transition-all hover:bg-blue-100 active:scale-[0.99] shadow-sm border border-blue-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center shadow-lg">
                  <i className="fas fa-history text-sm"></i>
                </div>
                <span className="text-xl tracking-tighter">Histórico de Abastecimentos</span>
              </div>
              <i className={`fas fa-chevron-down text-blue-400 transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}></i>
            </button>

            {isHistoryExpanded && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                {activeVehicle.entries.length === 0 ? (
                  <div className="bg-white p-12 rounded-[2.5rem] text-center text-gray-400 font-bold border border-gray-100">
                    Nenhum registro encontrado.
                  </div>
                ) : (
                  activeVehicle.entries.map((entry) => (
                    <div key={entry.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-blue-600">
                          <i className={`fas ${entry.fuelType === 'Gasolina' ? 'fa-gas-pump' : 'fa-leaf'}`}></i>
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-base">
                            R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(entry.date).toLocaleDateString('pt-BR')} • {entry.liters.toFixed(2)}L
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingEntry(entry)}
                          className="w-10 h-10 rounded-xl bg-gray-50 text-blue-500 flex items-center justify-center hover:bg-blue-50 transition-colors"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => removeFuelEntry(entry.id)}
                          className="w-10 h-10 rounded-xl bg-gray-50 text-red-400 flex items-center justify-center hover:bg-red-50 transition-colors"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* BOTÃO DE REMOÇÃO - FINAL E DISCRETO */}
          <div className="pt-8 flex justify-center border-t border-gray-100">
            <button 
              type="button"
              onClick={() => setVehicleToDeleteId(activeVehicle.id)} 
              className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-6 py-3 rounded-2xl hover:bg-red-50 transition-all group"
            >
              <i className="fas fa-trash-alt group-hover:scale-110 transition-transform"></i>
              Remover Veículo e Aba
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100 animate-in fade-in zoom-in-95">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-200">
            <i className="fas fa-car text-5xl"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Sua garagem está vazia</h2>
          <p className="text-gray-400 font-bold text-sm mb-10 max-w-xs mx-auto">Cadastre seu primeiro veículo para começar a controlar seus gastos e consumo.</p>
          <button onClick={() => setIsAddingVehicle(true)} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
            Adicionar Meu Primeiro Veículo
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {vehicleToDeleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Confirmar Exclusão?</h3>
            <p className="text-gray-500 font-bold mb-10 leading-relaxed">
              Você está prestes a remover o veículo <span className="text-gray-900">"{state.vehicles.find(v => v.id === vehicleToDeleteId)?.name}"</span>. 
              Esta ação apagará a aba e todos os registros de abastecimento permanentemente.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeRemoveVehicle}
                className="w-full bg-red-500 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-red-100 hover:bg-red-600 transition-all active:scale-95"
              >
                Sim, Deletar Tudo
              </button>
              <button 
                onClick={() => setVehicleToDeleteId(null)}
                className="w-full bg-gray-100 text-gray-500 py-5 rounded-[1.5rem] font-black text-lg hover:bg-gray-200 transition-all active:scale-95"
              >
                Não, Manter Veículo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS EXISTENTES */}
      {isManagingVehicles && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[3rem] max-w-2xl w-full shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-3xl font-black text-gray-900">Meus Veículos</h3>
              <button onClick={() => setIsManagingVehicles(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {state.vehicles.length === 0 ? (
                <div className="py-20 text-center text-gray-400 font-bold">Nenhum veículo cadastrado.</div>
              ) : (
                state.vehicles.map(v => (
                  <div key={v.id} className="bg-gray-50 p-6 rounded-[2rem] flex items-center justify-between border border-gray-100 hover:border-blue-200 transition-colors group">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                        {v.photo ? (
                          <img src={v.photo} className="w-full h-full object-cover" />
                        ) : (
                          <div 
                            style={{ backgroundColor: v.color }}
                            className="w-full h-full flex items-center justify-center text-white font-black text-xl"
                          >
                            {getUserInitials(v.name)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg">{v.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v.plate || 'S/ PLACA'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => triggerEditVehicle(v)}
                        className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                        title="Editar"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={() => setVehicleToDeleteId(v.id)}
                        className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                        title="Apagar"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8 px-2">
              <button onClick={() => { setIsAddingVehicle(true); setIsManagingVehicles(false); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg shadow-blue-50 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                <i className="fas fa-plus"></i> Novo Veículo
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-6 text-gray-900 tracking-tight">Novo Veículo</h3>
            <div className="space-y-4">
              <input type="text" autoFocus value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} placeholder="Apelido do veículo (Ex: Palio)" className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10" />
              <div className="flex gap-4 pt-4">
                <button onClick={addVehicle} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">Criar</button>
                <button onClick={() => setIsAddingVehicle(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddingFuel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <FuelingForm onSave={addFuelEntry} onCancel={() => setIsAddingFuel(false)} />
          </div>
        </div>
      )}

      {editingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <FuelingForm 
              initialData={editingEntry}
              onSave={updateFuelEntry} 
              onCancel={() => setEditingEntry(null)} 
            />
          </div>
        </div>
      )}

      {isEditingVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-md w-full animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-3xl font-black mb-8 text-gray-900">Configurar Veículo</h3>
            <div className="space-y-8">
              <div className="flex justify-center mb-4">
                <div className="w-36 h-36 bg-gray-50 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                  {editPhoto ? <img src={editPhoto} className="w-full h-full object-cover" /> : <i className="fas fa-camera text-3xl text-gray-200"></i>}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span className="text-[10px] font-black uppercase tracking-widest">Alterar Foto</span>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Nome / Modelo</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Placa</label>
                  <input type="text" value={editPlate} onChange={e => setEditPlate(e.target.value.toUpperCase())} placeholder="ABC-1234" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Cores do Painel</label>
                <div className="grid grid-cols-5 gap-3">
                  {PRESET_COLORS.map(color => (
                    <button 
                      key={color.hex} 
                      onClick={() => setEditColor(color.hex)} 
                      className={`w-full aspect-square rounded-xl transition-all shadow-sm ${editColor === color.hex ? 'ring-4 ring-offset-4 ring-blue-500 scale-110 shadow-lg' : 'hover:scale-105 opacity-80'}`} 
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={saveEditVehicle} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-50">Salvar Ajustes</button>
                <button onClick={() => setIsEditingVehicle(false)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-bold hover:bg-gray-200">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-sm w-full animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-8 text-gray-900">Seu Perfil</h3>
            <div className="space-y-6">
              <div className="flex justify-center mb-4">
                <div className="w-28 h-28 bg-gray-50 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative cursor-pointer group" onClick={() => profileFileInputRef.current?.click()}>
                  {profilePhoto ? (
                    <img src={profilePhoto} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-black text-2xl">
                      {getUserInitials(currentUser.username)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <i className="fas fa-camera text-sm"></i>
                  </div>
                </div>
                <input type="file" ref={profileFileInputRef} onChange={handleProfilePhotoChange} accept="image/*" className="hidden" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Como devemos te chamar?</label>
                <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-500/10" />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg">Salvar Perfil</button>
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-bold">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
