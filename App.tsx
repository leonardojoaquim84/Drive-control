
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, FuelEntry, AppState, User, UserAccount } from './types';
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

const App: React.FC = () => {
  // --- AUTHENTICATION & PERSISTENCE ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('drivecontrol_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [state, setState] = useState<AppState>({ vehicles: [], activeVehicleId: null });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isHydrated = useRef<string | null>(null);

  // --- UI STATE ---
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');

  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [isAddingFuel, setIsAddingFuel] = useState(false);
  const [isManagingVehicles, setIsManagingVehicles] = useState(false);
  
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

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hydrate data when user logs in
  useEffect(() => {
    if (currentUser) {
      setIsLoadingProfile(true);
      isHydrated.current = null;
      const dbKey = `dc_db_${currentUser.username.toLowerCase()}`;
      const savedData = localStorage.getItem(dbKey);
      
      const timer = setTimeout(() => {
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            setState(parsed);
          } catch (e) {
            setState({ vehicles: [], activeVehicleId: null });
          }
        } else {
          setState({ vehicles: [], activeVehicleId: null });
        }
        setIsLoadingProfile(false);
        isHydrated.current = currentUser.username;
        localStorage.setItem('drivecontrol_session', JSON.stringify(currentUser));
      }, 600);
      return () => clearTimeout(timer);
    } else {
      isHydrated.current = null;
      setState({ vehicles: [], activeVehicleId: null });
    }
  }, [currentUser?.username]);

  // Persist data when state changes
  useEffect(() => {
    if (currentUser && isHydrated.current === currentUser.username && !isLoadingProfile) {
      const dbKey = `dc_db_${currentUser.username.toLowerCase()}`;
      localStorage.setItem(dbKey, JSON.stringify(state));
    }
  }, [state, currentUser, isLoadingProfile]);

  // --- ACTIONS ---
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const accounts: UserAccount[] = JSON.parse(localStorage.getItem('drivecontrol_accounts') || '[]');
    const normalizedUsername = authUsername.trim();
    if (!normalizedUsername) return;

    const existingAccount = accounts.find(acc => acc.username.toLowerCase() === normalizedUsername.toLowerCase());

    if (isAuthMode === 'register') {
      if (existingAccount) {
        setAuthError('Perfil já existe.');
        return;
      }
      const newAccount: UserAccount = { username: normalizedUsername, password: '', photo: undefined };
      accounts.push(newAccount);
      localStorage.setItem('drivecontrol_accounts', JSON.stringify(accounts));
      const userObj = { username: normalizedUsername };
      setCurrentUser(userObj);
      localStorage.setItem('drivecontrol_session', JSON.stringify(userObj));
    } else {
      if (existingAccount) {
        const userObj = { username: existingAccount.username, photo: existingAccount.photo };
        setCurrentUser(userObj);
        localStorage.setItem('drivecontrol_session', JSON.stringify(userObj));
      } else {
        setAuthError('Usuário não encontrado.');
      }
    }
  };

  const handleLogout = () => {
    if (confirm('Deseja sair do DriveControl Pro?')) {
      isHydrated.current = null;
      localStorage.removeItem('drivecontrol_session');
      setCurrentUser(null);
      setState({ vehicles: [], activeVehicleId: null });
    }
  };

  const handleSaveProfile = () => {
    if (!currentUser || !profileName.trim()) return;
    const accounts: UserAccount[] = JSON.parse(localStorage.getItem('drivecontrol_accounts') || '[]');
    
    const updatedAccounts = accounts.map(acc => {
      if (acc.username.toLowerCase() === currentUser.username.toLowerCase()) {
        return { ...acc, username: profileName, photo: profilePhoto };
      }
      return acc;
    });
    
    localStorage.setItem('drivecontrol_accounts', JSON.stringify(updatedAccounts));
    const updatedUser = { username: profileName, photo: profilePhoto };
    setCurrentUser(updatedUser);
    localStorage.setItem('drivecontrol_session', JSON.stringify(updatedUser));
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
  }, [state.activeVehicleId]);

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

  const removeVehicle = (id: string) => {
    if (confirm(`Deseja realmente remover este veículo e todos os dados de abastecimento desta aba?`)) {
      setAiInsight('');
      setState(prev => {
        const remaining = prev.vehicles.filter(v => v.id !== id);
        return {
          ...prev,
          vehicles: remaining,
          activeVehicleId: remaining.length > 0 ? remaining[0].id : null
        };
      });
    }
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
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl text-white text-2xl mb-4 shadow-lg shadow-blue-100">
              <i className="fas fa-car-side"></i>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">DriveControl <span className="text-blue-600">Pro</span></h1>
            <p className="text-gray-400 font-bold text-sm mt-1">{isAuthMode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta gratuita'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="text"
              required
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              placeholder="Digite seu nome de usuário"
            />
            {authError && <p className="text-red-500 text-xs font-bold ml-2">{authError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-50 active:scale-[0.98] transition-all">
              {isAuthMode === 'login' ? 'Acessar Painel' : 'Registrar Agora'}
            </button>
            <button type="button" onClick={() => { setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="w-full text-sm font-bold text-blue-600 hover:underline">
              {isAuthMode === 'login' ? 'Ainda não tem perfil? Criar um' : 'Já possui perfil? Entrar aqui'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header aligned with mockup */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-100">
            <i className="fas fa-car-side"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">DriveControl <span className="text-blue-600">Pro</span></h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Painel de {currentUser.username}</p>
          </div>
        </div>

        {/* User profile initials/photo button */}
        <div className="relative inline-block mb-8" ref={userMenuRef}>
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors group">
            <div className="w-10 h-10 bg-white rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
              {currentUser.photo ? (
                <img src={currentUser.photo} className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-600 font-black text-sm">
                  {getUserInitials(currentUser.username)}
                </span>
              )}
            </div>
            <i className={`fas fa-chevron-down text-[8px] text-gray-400 mr-1 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {isUserMenuOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
               <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-50 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-inner">
                  {currentUser.photo ? <img src={currentUser.photo} className="w-full h-full object-cover rounded-full" /> : getUserInitials(currentUser.username)}
                </div>
                <div className="truncate">
                  <p className="text-xs font-black text-gray-900 truncate">{currentUser.username}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Membro DriveControl</p>
                </div>
              </div>
              
              <button onClick={() => { setIsManagingVehicles(true); setIsUserMenuOpen(false); }} className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                <i className="fas fa-car text-blue-500 text-lg"></i> Meus Veículos
              </button>

              <button onClick={() => { setIsEditingProfile(true); setIsUserMenuOpen(false); setProfileName(currentUser.username); setProfilePhoto(currentUser.photo); }} className="w-full text-left px-4 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors border-t border-gray-50">
                <i className="fas fa-user-circle text-gray-400 text-lg"></i> Gerenciar Perfil
              </button>
              
              <button onClick={handleLogout} className="w-full text-left px-4 py-4 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 border-t border-gray-50 transition-colors">
                <i className="fas fa-sign-out-alt text-lg"></i> Sair do Painel
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto no-scrollbar pb-2">
        {state.vehicles.map(vehicle => (
          <button
            key={vehicle.id}
            onClick={() => setState(prev => ({ ...prev, activeVehicleId: vehicle.id }))}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
              state.activeVehicleId === vehicle.id 
              ? 'bg-black text-white shadow-xl scale-105' 
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
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Main Vehicle Card */}
          <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gray-50/50 rounded-full -mr-36 -mt-36 -z-0"></div>
            
            <div className="relative z-10 flex flex-col items-start gap-8">
              <div 
                className="w-32 h-32 rounded-full overflow-hidden border-8 border-gray-50 bg-white flex items-center justify-center shadow-xl group cursor-pointer relative"
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

              <div>
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <h2 className="text-5xl font-black text-gray-900 tracking-tighter">{activeVehicle.name}</h2>
                  <div className="bg-black text-white px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest font-mono">
                    {activeVehicle.plate || 'AAA 111'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <button onClick={() => setIsAddingFuel(true)} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-gray-200 hover:bg-black transition-all active:scale-95">
                    <i className="fas fa-gas-pump"></i> Novo Abastecimento
                  </button>
                  <button onClick={() => { setIsEditingVehicle(true); setEditName(activeVehicle.name); setEditPlate(activeVehicle.plate); setEditColor(activeVehicle.color); setEditPhoto(activeVehicle.photo); }} className="bg-white text-gray-600 px-6 py-4 rounded-2xl font-black border border-gray-200 flex items-center gap-3 hover:bg-gray-50 active:scale-95">
                    <i className="fas fa-sliders-h"></i> Configurar
                  </button>
                </div>

                <div className="inline-block border border-blue-400 px-4 py-2 rounded-xl bg-blue-50/20">
                  <button onClick={() => removeVehicle(activeVehicle.id)} className="text-red-500 text-xs font-black hover:text-red-600 transition-colors">
                    Remover Veículo
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

          <StatsDashboard vehicle={activeVehicle} />
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

      {/* MODALS */}
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
                          <i className="fas fa-car text-2xl text-gray-200" style={{ color: v.color }}></i>
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
                        onClick={() => removeVehicle(v.id)}
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

      {isEditingVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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
                    <div className="w-full h-full flex items-center justify-center text-blue-600 font-black text-2xl">
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
