
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, FuelEntry, MaintenanceEntry, AppState, UserAccount, MaintenanceCategory } from './types';
import FuelingForm from './components/FuelingForm';
import MaintenanceForm from './components/MaintenanceForm';
import VehicleForm from './components/VehicleForm';
import StatsDashboard from './components/StatsDashboard';
import { getFuelInsights } from './services/geminiService';

type ViewMode = 'home' | 'vehicle_detail' | 'auth' | 'profile';
type VehicleTab = 'abastecimento' | 'manutencao';

const App: React.FC = () => {
  const [loggedUser, setLoggedUser] = useState<UserAccount | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [state, setState] = useState<AppState>({ vehicles: [], activeVehicleId: null });
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [activeTab, setActiveTab] = useState<VehicleTab>('abastecimento');

  // UI STATE
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [isAddingFuel, setIsAddingFuel] = useState(false);
  const [isAddingMaintenance, setIsAddingMaintenance] = useState(false);
  const [vehicleToDeleteId, setVehicleToDeleteId] = useState<string | null>(null);
  
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = localStorage.getItem('drivecontrol_session');
    if (session) {
      const user = JSON.parse(session);
      setLoggedUser(user);
      loadUserData(user.username);
      setViewMode('home');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (loggedUser) {
      localStorage.setItem(`drivecontrol_db_${loggedUser.username}`, JSON.stringify(state));
    }
  }, [state, loggedUser]);

  const loadUserData = (username: string) => {
    const savedData = localStorage.getItem(`drivecontrol_db_${username}`);
    if (savedData) {
      setState(JSON.parse(savedData));
    } else {
      setState({ vehicles: [], activeVehicleId: null });
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const usersRaw = localStorage.getItem('drivecontrol_users');
    const users: UserAccount[] = usersRaw ? JSON.parse(usersRaw) : [];

    if (authMode === 'register') {
      if (users.find(u => u.username.toLowerCase() === authUsername.toLowerCase())) {
        setAuthError('Este nome de usuário já está em uso.');
        return;
      }
      const newUser: UserAccount = { username: authUsername, password: authPassword };
      users.push(newUser);
      localStorage.setItem('drivecontrol_users', JSON.stringify(users));
      setAuthMode('login');
      setAuthError('Conta criada com sucesso! Faça seu login.');
    } else {
      const user = users.find(u => u.username.toLowerCase() === authUsername.toLowerCase() && u.password === authPassword);
      if (user) {
        setLoggedUser(user);
        localStorage.setItem('drivecontrol_session', JSON.stringify(user));
        loadUserData(user.username);
        setViewMode('home');
      } else {
        setAuthError('Usuário ou senha incorretos.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('drivecontrol_session');
    setLoggedUser(null);
    setViewMode('auth');
    setIsUserMenuOpen(false);
  };

  const activeVehicle = useMemo(() => 
    state.vehicles.find(v => v.id === state.activeVehicleId),
    [state.vehicles, state.activeVehicleId]
  );

  const globalStats = useMemo(() => {
    const totalSpent = state.vehicles.reduce((acc, v) => 
      acc + (v.entries?.reduce((vAcc, e) => vAcc + e.value, 0) || 0) + 
      (v.maintenanceEntries?.reduce((vAcc, e) => vAcc + e.value, 0) || 0), 0);
    const totalLiters = state.vehicles.reduce((acc, v) => 
      acc + (v.entries?.reduce((vAcc, e) => vAcc + e.liters, 0) || 0), 0);
    return { totalSpent, totalLiters };
  }, [state.vehicles]);

  const maintenanceSummaryByCategory = useMemo(() => {
    if (!activeVehicle) return [];
    const totals: Record<string, number> = {};
    activeVehicle.maintenanceEntries?.forEach(entry => {
      totals[entry.category] = (totals[entry.category] || 0) + entry.value;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [activeVehicle]);

  const handleGetInsights = async () => {
    if (!activeVehicle || !activeVehicle.entries || activeVehicle.entries.length === 0) return;
    setIsInsightLoading(true);
    const insight = await getFuelInsights(activeVehicle);
    setAiInsight(insight);
    setIsInsightLoading(false);
  };

  useEffect(() => {
    if (activeVehicle && activeVehicle.entries && activeVehicle.entries.length > 0) {
      handleGetInsights();
    } else {
      setAiInsight('');
    }
  }, [state.activeVehicleId]);

  const addVehicle = (data: Partial<Vehicle>) => {
    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      name: data.name || 'Sem nome',
      model: data.model || '',
      plate: data.plate || '',
      color: data.color || '#2563eb',
      photo: data.photo,
      entries: [],
      maintenanceEntries: [],
    };
    setState(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, newVehicle],
      activeVehicleId: newVehicle.id
    }));
    setIsAddingVehicle(false);
    setViewMode('vehicle_detail');
  };

  const updateVehicle = (data: Partial<Vehicle>) => {
    if (!state.activeVehicleId) return;
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === state.activeVehicleId ? { ...v, ...data } : v
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
          ? { ...v, entries: [newEntry, ...(v.entries || [])] } 
          : v
      )
    }));
    setIsAddingFuel(false);
  };

  const addMaintenanceEntry = (data: Omit<MaintenanceEntry, 'id'>) => {
    if (!state.activeVehicleId) return;
    const newEntry: MaintenanceEntry = {
      ...data,
      id: Date.now().toString(),
    };
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === state.activeVehicleId 
          ? { ...v, maintenanceEntries: [newEntry, ...(v.maintenanceEntries || [])] } 
          : v
      )
    }));
    setIsAddingMaintenance(false);
  };

  const removeFuelEntry = (entryId: string) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === state.activeVehicleId ? { ...v, entries: v.entries.filter(e => e.id !== entryId) } : v
      )
    }));
  };

  const removeMaintenanceEntry = (entryId: string) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === state.activeVehicleId ? { ...v, maintenanceEntries: v.maintenanceEntries.filter(e => e.id !== entryId) } : v
      )
    }));
  };

  const getUserInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : "??";

  if (isLoading) return null;

  if (viewMode === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-4xl shadow-xl mx-auto mb-6">
              <i className="fas fa-car-side"></i>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">DriveControl Pro</h1>
            <p className="text-gray-400 font-bold mt-2">{authMode === 'login' ? 'Entre na sua garagem digital' : 'Crie sua conta gratuita'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="text" placeholder="Usuário" required value={authUsername} onChange={e => setAuthUsername(e.target.value)} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
            <input type="password" placeholder="Senha" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
            {authError && <p className="text-red-500 text-xs font-black text-center">{authError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
              {authMode === 'login' ? 'Acessar Painel' : 'Registrar'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-8 text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">
            {authMode === 'login' ? 'Não possui conta? Registre-se' : 'Já é cadastrado? Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewMode('home')}>
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
            <i className="fas fa-car-side"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">DriveControl <span className="text-blue-600">Pro</span></h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Controle de Frota</p>
          </div>
        </div>
        <div className="relative" ref={userMenuRef}>
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-1 bg-white border border-gray-100 rounded-full shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100 overflow-hidden">
              {loggedUser?.photo ? <img src={loggedUser.photo} className="w-full h-full object-cover rounded-full" /> : getUserInitials(loggedUser?.username || '')}
            </div>
            <span className="font-bold text-sm text-gray-700 pr-3 hidden sm:inline">{loggedUser?.username}</span>
          </button>
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <button onClick={handleLogout} className="w-full text-left px-5 py-4 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3"><i className="fas fa-sign-out-alt"></i> Sair da Conta</button>
            </div>
          )}
        </div>
      </header>

      {viewMode === 'home' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/40 rounded-full -mr-24 -mt-24"></div>
             <div className="relative z-10">
               <h2 className="text-3xl font-black text-gray-900 mb-2">Painel Global</h2>
               <p className="text-gray-400 font-bold mb-10">Resumo de gastos de toda sua frota.</p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-blue-600 text-white p-7 rounded-[2rem] shadow-xl shadow-blue-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Custo Total Acumulado</p>
                    <p className="text-3xl font-black">R$ {globalStats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div className="bg-gray-900 text-white p-7 rounded-[2rem] shadow-xl shadow-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Combustível</p>
                    <p className="text-3xl font-black">{globalStats.totalLiters.toFixed(1)} <span className="text-sm font-medium">L</span></p>
                 </div>
               </div>
             </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-6 px-4">
              <h3 className="text-xl font-black text-gray-900">Sua Garagem</h3>
              <button onClick={() => setIsAddingVehicle(true)} className="bg-blue-50 text-blue-600 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                <i className="fas fa-plus mr-2"></i> Adicionar
              </button>
            </div>
            {state.vehicles.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[3rem] p-16 text-center text-gray-400 font-bold">Nenhum veículo cadastrado.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {state.vehicles.map(v => (
                  <button key={v.id} onClick={() => { setState(s => ({...s, activeVehicleId: v.id})); setViewMode('vehicle_detail'); setActiveTab('abastecimento'); }} className="group bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all text-left flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black overflow-hidden shadow-sm" style={{ backgroundColor: v.photo ? 'transparent' : v.color }}>
                      {v.photo ? <img src={v.photo} className="w-full h-full object-cover" /> : getUserInitials(v.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-lg font-black text-gray-900 truncate">{v.name}</h4>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{v.plate || 'SEM PLACA'}</p>
                    </div>
                    <i className="fas fa-chevron-right text-gray-200 group-hover:text-blue-500 transition-colors"></i>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {viewMode === 'vehicle_detail' && activeVehicle && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setViewMode('home')} className="flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600">
              <i className="fas fa-arrow-left"></i> Início
            </button>
            <div className="flex gap-4">
              <button onClick={() => setIsEditingVehicle(true)} className="text-blue-400 hover:text-blue-500 text-[10px] font-black uppercase tracking-widest">Editar Veículo</button>
              <button onClick={() => setVehicleToDeleteId(activeVehicle.id)} className="text-red-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest">Apagar</button>
            </div>
          </div>

          {/* Vehicle Header */}
          <div className="bg-white rounded-t-[3rem] p-8 lg:p-12 pb-6 border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-24 bg-gray-50/50"></div>
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-white flex items-center justify-center text-white text-4xl font-black mb-6 shadow-2xl relative z-10 overflow-hidden" style={{ backgroundColor: activeVehicle.photo ? 'transparent' : activeVehicle.color }}>
              {activeVehicle.photo ? <img src={activeVehicle.photo} className="w-full h-full object-cover" /> : getUserInitials(activeVehicle.name)}
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-1 z-10">{activeVehicle.name}</h2>
            <p className="text-gray-400 font-bold mb-4 z-10">{activeVehicle.model || 'Sem modelo definido'}</p>
            <div className="bg-gray-100 text-gray-500 px-6 py-2 rounded-full text-[14px] font-black uppercase tracking-[0.2em] font-mono mb-6 z-10 border border-gray-200">{activeVehicle.plate || 'SEM PLACA'}</div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl mx-4 sm:mx-12">
            <button 
              onClick={() => setActiveTab('abastecimento')}
              className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'abastecimento' ? 'bg-white text-blue-600 shadow-md scale-105 z-10' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-gas-pump mr-2"></i> Abastecimento
            </button>
            <button 
              onClick={() => setActiveTab('manutencao')}
              className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'manutencao' ? 'bg-white text-blue-600 shadow-md scale-105 z-10' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-tools mr-2"></i> Manutenção
            </button>
          </div>

          <div className="px-1 py-4">
            {activeTab === 'abastecimento' ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <button onClick={() => setIsAddingFuel(true)} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-orange-600 transition-all">
                  <i className="fas fa-plus"></i> Registrar Abastecimento
                </button>
                
                <div className="bg-blue-600 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-xs"><i className="fas fa-robot"></i></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Insights da IA</span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed italic opacity-95">"{isInsightLoading ? 'Analisando dados...' : (aiInsight || 'Adicione dados para receber análise da IA.')}"</p>
                  </div>
                </div>

                <StatsDashboard vehicle={activeVehicle} />

                <section>
                  <h3 className="text-xl font-black text-gray-900 mb-6 px-4">Histórico</h3>
                  <div className="space-y-4">
                    {(activeVehicle.entries || []).map(entry => (
                      <div key={entry.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${entry.fuelType === 'Gasolina' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                            <i className="fas fa-gas-pump"></i>
                          </div>
                          <div>
                            <p className="font-black text-gray-900">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString('pt-BR')} • {entry.liters.toFixed(2)}L</p>
                          </div>
                        </div>
                        <button onClick={() => removeFuelEntry(entry.id)} className="text-gray-300 hover:text-red-500 transition-all"><i className="fas fa-trash-alt"></i></button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300">
                <button onClick={() => setIsAddingMaintenance(true)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-blue-700 transition-all">
                  <i className="fas fa-plus"></i> Registrar Manutenção
                </button>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Gasto Total Oficina</p>
                    <p className="text-3xl font-black text-red-500">R$ {(activeVehicle.maintenanceEntries || []).reduce((acc, e) => acc + e.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  
                  {/* Detailed Discrimination */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Discriminação por Categoria</h4>
                    {maintenanceSummaryByCategory.length === 0 ? (
                      <p className="text-xs font-bold text-gray-300">Nenhum dado detalhado ainda.</p>
                    ) : (
                      <div className="space-y-3">
                        {maintenanceSummaryByCategory.map(([cat, val]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600">{cat}</span>
                            <span className="text-xs font-black text-gray-900">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <section>
                  <h3 className="text-xl font-black text-gray-900 mb-6 px-4">Histórico Discriminado</h3>
                  <div className="space-y-4">
                    {(activeVehicle.maintenanceEntries || []).length === 0 ? (
                      <p className="text-center py-10 text-gray-400 font-bold italic">Nenhuma manutenção registrada.</p>
                    ) : (
                      activeVehicle.maintenanceEntries.map(entry => (
                        <div key={entry.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${entry.type === 'Preventiva' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                              <i className={entry.category === 'Troca de Óleo' ? 'fas fa-oil-can' : entry.category === 'Pneus' ? 'fas fa-compact-disc' : 'fas fa-tools'}></i>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  {entry.category}
                                </span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${entry.type === 'Preventiva' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                  {entry.type}
                                </span>
                              </div>
                              <p className="font-black text-gray-900 text-lg mt-1">{entry.description}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {new Date(entry.date).toLocaleDateString('pt-BR')} • {entry.km.toLocaleString()} KM
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <p className="font-black text-gray-900 text-lg">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <button onClick={() => removeMaintenanceEntry(entry.id)} className="text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><i className="fas fa-trash-alt"></i></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {(isAddingVehicle || isEditingVehicle) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <VehicleForm 
            initialData={isEditingVehicle ? activeVehicle : undefined}
            onSave={isEditingVehicle ? updateVehicle : addVehicle}
            onCancel={() => { setIsAddingVehicle(false); setIsEditingVehicle(false); }}
          />
        </div>
      )}

      {isAddingFuel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <FuelingForm onSave={addFuelEntry} onCancel={() => setIsAddingFuel(false)} />
          </div>
        </div>
      )}

      {isAddingMaintenance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <MaintenanceForm onSave={addMaintenanceEntry} onCancel={() => setIsAddingMaintenance(false)} />
          </div>
        </div>
      )}

      {vehicleToDeleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-8">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"><i className="fas fa-trash"></i></div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Excluir Veículo?</h3>
            <p className="text-gray-500 font-bold mb-10">Todos os dados de abastecimento e manutenção serão perdidos.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setState(prev => ({ ...prev, vehicles: prev.vehicles.filter(v => v.id !== vehicleToDeleteId), activeVehicleId: null })); setVehicleToDeleteId(null); setViewMode('home'); }} className="w-full bg-red-500 text-white py-5 rounded-2xl font-black">Apagar Tudo</button>
              <button onClick={() => setVehicleToDeleteId(null)} className="w-full bg-gray-100 text-gray-500 py-5 rounded-2xl font-black">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
