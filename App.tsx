
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, FuelEntry, AppState, User, UserAccount } from './types';
import FuelingForm from './components/FuelingForm';
import StatsDashboard from './components/StatsDashboard';
import { getFuelInsights } from './services/geminiService';

const PRESET_COLORS = [
  { name: 'Azul Real', hex: '#2563eb' },
  { name: 'Azul Céu', hex: '#0ea5e9' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Violeta', hex: '#7c3aed' },
  { name: 'Roxo', hex: '#a855f7' },
  { name: 'Fúcsia', hex: '#d946ef' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Rosa Choque', hex: '#f43f5e' },
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Âmbar', hex: '#f59e0b' },
  { name: 'Amarelo', hex: '#eab308' },
  { name: 'Lima', hex: '#84cc16' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Ciano', hex: '#06b6d4' },
  { name: 'Slate', hex: '#64748b' },
  { name: 'Grafite', hex: '#374151' },
  { name: 'Preto', hex: '#000000' },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('drivecontrol_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [state, setState] = useState<AppState>({ vehicles: [], activeVehicleId: null });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isHydrated = useRef<string | null>(null);

  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [isAddingFuel, setIsAddingFuel] = useState(false);
  
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
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  useEffect(() => {
    if (currentUser && isHydrated.current === currentUser.username && !isLoadingProfile) {
      const dbKey = `dc_db_${currentUser.username.toLowerCase()}`;
      localStorage.setItem(dbKey, JSON.stringify(state));
    }
  }, [state, currentUser, isLoadingProfile]);

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
      const newAccount: UserAccount = { username: normalizedUsername, password: '' };
      accounts.push(newAccount);
      localStorage.setItem('drivecontrol_accounts', JSON.stringify(accounts));
      setCurrentUser({ username: normalizedUsername });
    } else {
      if (existingAccount) {
        setCurrentUser({ username: existingAccount.username, photo: existingAccount.photo });
      } else {
        setAuthError('Usuário não encontrado.');
      }
    }
  };

  const handleLogout = () => {
    if (confirm('Sair do perfil?')) {
      isHydrated.current = null;
      localStorage.removeItem('drivecontrol_session');
      setCurrentUser(null);
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
    if (confirm(`Excluir aba do veículo?`)) {
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl text-white text-2xl mb-4 shadow-lg shadow-blue-100">
              <i className="fas fa-car-side"></i>
            </div>
            <h1 className="text-2xl font-black text-gray-900">DriveControl <span className="text-blue-600">Pro</span></h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="text"
              required
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
              placeholder="Nome de usuário"
            />
            {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">
              {isAuthMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
            <button type="button" onClick={() => setIsAuthMode(isAuthMode === 'login' ? 'register' : 'login')} className="w-full text-sm font-bold text-blue-600">
              {isAuthMode === 'login' ? 'Criar perfil' : 'Já tenho perfil'}
            </button>
          </form>
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

        {/* User profile dropdown below name */}
        <div className="relative inline-block mb-8" ref={userMenuRef}>
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <div className="w-8 h-8 bg-white rounded-full overflow-hidden border-2 border-white shadow-sm">
              {currentUser.photo ? <img src={currentUser.photo} className="w-full h-full object-cover" /> : <i className="fas fa-user text-gray-300 mt-2"></i>}
            </div>
            <i className="fas fa-chevron-down text-[8px] text-gray-400 mr-1"></i>
          </button>
          {isUserMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50">
              <button onClick={() => { setIsEditingProfile(true); setIsUserMenuOpen(false); setProfileName(currentUser.username); setProfilePhoto(currentUser.photo); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <i className="fas fa-user-circle text-blue-500"></i> Perfil
              </button>
              <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50">
                <i className="fas fa-sign-out-alt"></i> Sair
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
              ? 'bg-black text-white shadow-lg' 
              : 'bg-blue-50 text-blue-600'
            }`}
          >
            <i className="fas fa-car text-xs"></i>
            {vehicle.name}
          </button>
        ))}
        <button
          onClick={() => setIsAddingVehicle(true)}
          className="flex-shrink-0 px-6 py-3 font-black text-sm text-blue-600 bg-blue-50 rounded-2xl flex items-center gap-2 hover:bg-blue-100"
        >
          <i className="fas fa-plus-circle"></i>
          Novo Veículo
        </button>
      </div>

      {activeVehicle ? (
        <div className="space-y-10">
          {/* Main Vehicle Card - Image and Actions as shown in mockup */}
          <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-sm border border-gray-50 relative overflow-hidden">
            {/* Subtle background circle element like in image */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full -mr-32 -mt-32 -z-0"></div>
            
            <div className="relative z-10 flex flex-col items-start gap-8">
              {/* Circular vehicle photo */}
              <div className="w-32 h-32 rounded-full overflow-hidden border-8 border-gray-50 bg-gray-100 flex items-center justify-center shadow-inner">
                {activeVehicle.photo ? (
                  <img src={activeVehicle.photo} className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-car-side text-4xl text-gray-200"></i>
                )}
              </div>

              <div>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-5xl font-black text-gray-900 tracking-tighter">{activeVehicle.name}</h2>
                  <div className="bg-black text-white px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest">
                    {activeVehicle.plate || 'AAA 222'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <button onClick={() => setIsAddingFuel(true)} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-black transition-all active:scale-95">
                    <i className="fas fa-gas-pump"></i> Novo Abastecimento
                  </button>
                  <button onClick={() => { setIsEditingVehicle(true); setEditName(activeVehicle.name); setEditPlate(activeVehicle.plate); setEditColor(activeVehicle.color); setEditPhoto(activeVehicle.photo); }} className="bg-white text-gray-600 px-6 py-4 rounded-2xl font-black border border-gray-200 flex items-center gap-3 hover:bg-gray-50">
                    <i className="fas fa-sliders-h"></i> Configurar
                  </button>
                </div>

                {/* Specific removal button styling from mockup */}
                <div className="inline-block border border-blue-400 px-3 py-1.5 rounded-lg">
                  <button onClick={() => removeVehicle(activeVehicle.id)} className="text-red-500 text-xs font-bold hover:text-red-600">
                    Remover Veículo
                  </button>
                </div>
              </div>

              {/* AI Drive Insight Box */}
              <div className="w-full bg-blue-50/50 rounded-[2.5rem] p-8 border border-blue-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">
                    <i className="fas fa-robot"></i>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">AI Drive Insight</span>
                </div>
                {isInsightLoading ? (
                  <p className="text-sm text-gray-400 font-bold italic animate-pulse">Analisando seus dados...</p>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed font-bold italic">
                    "{aiInsight || "Comece a abastecer para que eu possa analisar sua eficiência e te dar as melhores dicas!"}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <StatsDashboard vehicle={activeVehicle} />
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
          <i className="fas fa-car text-6xl text-gray-200 mb-6"></i>
          <h2 className="text-2xl font-black text-gray-900 mb-4">Garagem vazia</h2>
          <button onClick={() => setIsAddingVehicle(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black">Adicionar Veículo</button>
        </div>
      )}

      {/* Modals */}
      {isAddingVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Novo Veículo</h3>
            <div className="space-y-4">
              <input type="text" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} placeholder="Nome do veículo" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" />
              <div className="flex gap-4 pt-4">
                <button onClick={addVehicle} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black">Criar</button>
                <button onClick={() => setIsAddingVehicle(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddingFuel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="max-w-xl w-full">
            <FuelingForm onSave={addFuelEntry} onCancel={() => setIsAddingFuel(false)} />
          </div>
        </div>
      )}

      {isEditingVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full animate-in zoom-in-95">
            <h3 className="text-3xl font-black mb-8">Editar Veículo</h3>
            <div className="space-y-6">
              <div className="flex justify-center mb-4">
                <div className="w-32 h-32 bg-gray-50 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {editPhoto ? <img src={editPhoto} className="w-full h-full object-cover" /> : <i className="fas fa-camera text-3xl text-gray-200"></i>}
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
              </div>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" />
              <input type="text" value={editPlate} onChange={e => setEditPlate(e.target.value.toUpperCase())} placeholder="Placa (Ex: ABC-1234)" className="w-full p-4 bg-gray-50 rounded-2xl font-black uppercase" />
              <div className="flex gap-4 pt-4">
                <button onClick={saveEditVehicle} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black">Salvar</button>
                <button onClick={() => setIsEditingVehicle(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full">
            <h3 className="text-2xl font-black mb-8">Editar Perfil</h3>
            <div className="space-y-6">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 bg-gray-50 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => profileFileInputRef.current?.click()}>
                  {profilePhoto ? <img src={profilePhoto} className="w-full h-full object-cover" /> : <i className="fas fa-user text-3xl text-gray-200"></i>}
                </div>
                <input type="file" ref={profileFileInputRef} onChange={handleProfilePhotoChange} accept="image/*" className="hidden" />
              </div>
              <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-black" />
              <div className="flex gap-4 pt-4">
                <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black">Salvar</button>
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
