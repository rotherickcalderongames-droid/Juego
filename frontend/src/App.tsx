import { useState, useEffect, useCallback } from 'react';
import { Terminal } from './components/Terminal';
import { StatsPanel } from './components/StatsPanel';
import { AvatarDisplay } from './components/AvatarDisplay';
import { ShopPanel } from './components/ShopPanel';
import { LogOut, BookOpen, User as UserIcon, Lock, Mail, Play, Shield } from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { useSpeech } from './hooks/useSpeech';

const API_BASE = 'http://localhost:5002/api';

interface Stats {
  sanity: number;
  compliance: number;
  credits: number;
  netPulse: number;
}

interface Narrative {
  situationText: string;
  audioNarrativeText: string;
  options: {
    optionId: number;
    text: string;
    statsChanges: {
      sanity: number;
      compliance: number;
      credits: number;
      netPulse: number;
    };
  }[];
  isGameOver: boolean;
  endingDetails: {
    endingId: string | null;
    title: string | null;
    description: string | null;
  } | null;
}

interface Ending {
  _id: string;
  endingId: string;
  title: string;
  description: string;
  unlockedAt: string;
}

export default function App() {
  const { speak } = useSpeech();
  
  // Auth state
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(sessionStorage.getItem('username'));
  const [role, setRole] = useState<string | null>(sessionStorage.getItem('role'));
  const [viewingAdmin, setViewingAdmin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form states
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  // Game state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ sanity: 100, compliance: 50, credits: 100, netPulse: 100 });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<any>(null);
  const [implants, setImplants] = useState<string[]>([]);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'stats' | 'shop'>('stats');
  const [antigravityActive, setAntigravityActive] = useState(false);
  const [unlockedEndings, setUnlockedEndings] = useState<Ending[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActive, setHasActive] = useState(false); // Check if active session exists
  const [selectedGender, setSelectedGender] = useState<'masculino' | 'femenino' | 'no-binario'>('no-binario');

  // Fetch unlocked endings
  const fetchEndings = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/game/endings`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnlockedEndings(data);
      }
    } catch (err) {
      console.error('Error fetching endings:', err);
    }
  }, []);

  // Check if active session exists in MongoDB
  const checkActiveSession = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/game/active`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHasActive(data.hasActive);
      }
    } catch (err) {
      console.error('Error checking active session:', err);
    }
  }, []);

  // Sync token and load endings / active sessions on mount
  useEffect(() => {
    if (token) {
      fetchEndings(token);
      checkActiveSession(token);
    }
  }, [token, fetchEndings, checkActiveSession]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo de inicio de sesión');

      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('username', data.user.username);
      sessionStorage.setItem('role', data.user.role);
      setToken(data.token);
      setUsername(data.user.username);
      setRole(data.user.role);
      setLoginPass('');
      fetchEndings(data.token);
      checkActiveSession(data.token);
      speak(`Inicio de sesión correcto. Bienvenido de vuelta, operario ${data.user.username}.`);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUser, email: regEmail, password: regPass })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo de registro');

      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('username', data.user.username);
      sessionStorage.setItem('role', 'Jugador');
      setToken(data.token);
      setUsername(data.user.username);
      setRole('Jugador');
      setRegPass('');
      speak(`Registro completado. Bienvenido al mainframe, operario ${data.user.username}.`);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    speak("Conexión terminada. Saliendo del mainframe corporativo.");
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('role');
    setToken(null);
    setUsername(null);
    setRole(null);
    setSessionId(null);
    setNarrative(null);
    setAntigravityActive(false);
    setHasActive(false);
    setViewingAdmin(false);
  };

  // Start or resume game session
  const handleStartGame = async (resumeSession: boolean = false, forceNew: boolean = false, gender: string = 'no-binario') => {
    if (!token) return;
    setIsLoading(true);
    setAntigravityActive(false);

    try {
      if (resumeSession) {
        speak("Reanudando simulación activa persistente.");
      } else {
        speak("Iniciando inyección de conciencia en el mainframe.");
      }
      const res = await fetch(`${API_BASE}/game/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resume: resumeSession, forceNew, gender })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo al iniciar partida');

      setSessionId(data.sessionId);
      setStats(data.stats);
      setAvatarUrl(data.avatarUrl);
      setAvatarConfig(data.avatarConfig || null);
      setImplants(data.implants || []);
      setNarrative(data.narrative);
      setHasActive(true); // Game is active now
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Send player command
  const handleSendCommand = async (command: string) => {
    if (!token) return;

    const lowerCmd = command.trim().toLowerCase();
    if ((lowerCmd === 'reset' || lowerCmd === 'reiniciar') && narrative?.isGameOver) {
      setNarrative(null);
      await handleStartGame(false, false, selectedGender);
      return;
    }

    if (!sessionId) return;
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/game/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId, command })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error procesando comando');

      setStats(data.stats);
      setAvatarUrl(data.avatarUrl);
      setAvatarConfig(data.avatarConfig || null);
      setAntigravityActive(data.antigravityActive);
      setNarrative(data.narrative);
      setImplants(data.implants || []);

      // Refresh unlocked endings list if game is over
      if (data.narrative.isGameOver) {
        fetchEndings(token);
        setHasActive(false); // Session completed
      }
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyItem = async (itemId: string) => {
    if (!token || !sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/game/shop/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId, itemId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fallo al comprar implante');

      setStats(data.stats);
      setAvatarUrl(data.avatarUrl);
      setAvatarConfig(data.avatarConfig || null);
      setImplants(data.implants || []);
      
      speak(data.message || "Implante instalado correctamente.");
      
      if (narrative) {
        setNarrative({
          ...narrative,
          situationText: `[TIENDA QUANTUM] Compra e instalación completada.\n\nNuevo saldo: ₵ ${data.stats.credits}\nEstadísticas actualizadas con éxito.\nImplante activo en tu cromo neural.`,
          audioNarrativeText: "Instalación de cromo completada con éxito."
        });
      }
    } catch (err: any) {
      alert(`Error de compra: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-screen h-screen flex flex-col justify-between p-4 bg-crt-bg overflow-hidden text-crt-green">
      
      {/* 1. AUTHENTICATION SCREENS (No token) */}
      {!token ? (
        <div className="flex-1 flex flex-col justify-center items-center relative select-text">
          <div className="scanline-animation" />
          
          <div className="w-full max-w-md p-6 border-2 border-crt-green bg-black/90 glow-border-green relative crt-screen rounded">
            <h1 className="text-2xl font-extrabold tracking-widest text-center mb-2 glow-green text-crt-green">
              NEO-BANDERSNATCH MAINFRAME
            </h1>
            <p className="text-xs text-center text-crt-dim mb-6 uppercase tracking-wider">
              Control de Accesos Corporativo - UPDS
            </p>

            {authError && (
              <div className="mb-4 p-2 border border-crt-red bg-crt-red/10 text-crt-red text-sm text-center font-bold glow-red">
                ❌ {authError}
              </div>
            )}

            {!isRegistering ? (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase mb-1 text-crt-dim">Usuario del Sistema</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-crt-dim" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-3 py-2 bg-crt-darkgreen/40 border border-crt-green/40 text-crt-green focus:border-crt-green focus:ring-0 outline-none rounded font-mono text-sm"
                      placeholder="Username"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase mb-1 text-crt-dim">Cifra de Seguridad (Password)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-crt-dim" />
                    <input
                      type="password"
                      className="w-full pl-10 pr-3 py-2 bg-crt-darkgreen/40 border border-crt-green/40 text-crt-green focus:border-crt-green focus:ring-0 outline-none rounded font-mono text-sm"
                      placeholder="Password"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-crt-green hover:bg-crt-green/80 text-black font-extrabold tracking-widest uppercase transition-all rounded"
                >
                  {isLoading ? 'Conectando...' : 'Autenticar'}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(true); setAuthError(null); }}
                    className="text-xs text-crt-dim hover:text-crt-green underline"
                  >
                    Registrar nuevo Nodo de Operario
                  </button>
                </div>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase mb-1 text-crt-dim">Nombre de Operario</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-crt-dim" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-3 py-2 bg-crt-darkgreen/40 border border-crt-green/40 text-crt-green focus:border-crt-green focus:ring-0 outline-none rounded font-mono text-sm"
                      placeholder="Username"
                      value={regUser}
                      onChange={(e) => setRegUser(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase mb-1 text-crt-dim">Canal Encriptado (Email)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-crt-dim" />
                    <input
                      type="email"
                      className="w-full pl-10 pr-3 py-2 bg-crt-darkgreen/40 border border-crt-green/40 text-crt-green focus:border-crt-green focus:ring-0 outline-none rounded font-mono text-sm"
                      placeholder="Email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase mb-1 text-crt-dim">Llave Simétrica (Password)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-crt-dim" />
                    <input
                      type="password"
                      className="w-full pl-10 pr-3 py-2 bg-crt-darkgreen/40 border border-crt-green/40 text-crt-green focus:border-crt-green focus:ring-0 outline-none rounded font-mono text-sm"
                      placeholder="Password"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-crt-green hover:bg-crt-green/80 text-black font-extrabold tracking-widest uppercase transition-all rounded"
                >
                  {isLoading ? 'Registrando...' : 'Registrar Operario'}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(false); setAuthError(null); }}
                    className="text-xs text-crt-dim hover:text-crt-green underline"
                  >
                    Ya tengo cuenta. Volver al Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : viewingAdmin ? (
        <AdminPanel token={token} onClose={() => setViewingAdmin(false)} />
      ) : (
        /* 2. GAME MAINFRAME LAYOUT */
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative select-text">
          
          {/* Main Console Column */}
          <div className="flex-1 flex flex-col justify-center">
            {narrative ? (
              <Terminal
                narrative={narrative}
                onSubmitCommand={handleSendCommand}
                isLoading={isLoading}
                onLogout={handleLogout}
              />
            ) : (
              /* START PLAY DIALOG */
              <div className="border-2 border-crt-green bg-black/90 p-8 glow-border-green text-center max-w-xl mx-auto rounded relative overflow-hidden crt-screen">
                <div className="scanline-animation" />
                <h2 className="text-xl font-bold tracking-wider text-crt-green mb-4 glow-green">
                  CONEXIÓN INICIALIZADA CON EL MAINBOARD
                </h2>
                <p className="text-sm text-crt-green/80 mb-6 leading-relaxed">
                  Operario <span className="text-crt-yellow font-bold">{username}</span>, tu sesión de auditoría está lista para la inyección cuántica. Elige una opción de conexión a la base de datos de Neo-Bandersnatch.
                </p>
                
                {/* Gender selector section */}
                <div className="mb-6 max-w-xs mx-auto text-left border border-crt-green/20 p-4 bg-crt-darkgreen/20 rounded">
                  <label className="block text-xs uppercase mb-2 text-crt-dim tracking-wider font-bold">
                    [1] Selecciona tu Identidad / Género
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value as any)}
                    className="w-full bg-black border border-crt-green/40 text-crt-green focus:border-crt-green focus:ring-0 outline-none rounded font-mono text-sm py-2 px-3 transition-colors cursor-pointer"
                  >
                    <option value="masculino">🚹 Masculino</option>
                    <option value="femenino">🚺 Femenino</option>
                    <option value="no-binario">🤖 No Binario / Cyborg</option>
                  </select>
                  <p className="text-[10px] text-crt-dim mt-2 leading-tight">
                    * El género seleccionado se utilizará para inicializar tu avatar y se mantendrá estático durante toda la simulación.
                  </p>
                </div>

                {hasActive ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                      <button
                        onClick={() => handleStartGame(true)}
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-crt-green hover:bg-crt-green/85 text-black font-bold tracking-widest uppercase rounded cursor-pointer transition-all focus:outline-none glow-border-green"
                      >
                        <Play className="w-5 h-5 fill-black" />
                        REANUDAR PARTIDA
                      </button>
                      <button
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-crt-darkgreen/40 hover:bg-crt-darkgreen border border-crt-green/40 text-crt-green font-bold tracking-widest uppercase rounded cursor-pointer transition-all focus:outline-none"
                      >
                        <LogOut className="w-5 h-5" />
                        CAMBIAR USUARIO
                      </button>
                      {role === 'Administrador' && (
                        <button
                          onClick={() => setViewingAdmin(true)}
                          disabled={isLoading}
                          className="w-full sm:col-span-2 inline-flex items-center justify-center gap-2 px-6 py-3 bg-crt-yellow/20 hover:bg-crt-yellow/45 text-crt-yellow border border-crt-yellow font-bold tracking-widest uppercase rounded cursor-pointer transition-all focus:outline-none glow-border-yellow"
                        >
                          <Shield className="w-5 h-5" />
                          CONSOLA ADMIN
                        </button>
                      )}
                    </div>
                    <div className="p-3 border border-crt-yellow/30 bg-crt-yellow/5 text-xs text-crt-yellow/90 max-w-md mx-auto leading-relaxed rounded">
                      Tienes una simulación activa en curso. Las decisiones en Neo-Bandersnatch son irreversibles y las líneas temporales inmutables. Debes reanudar la partida actual y afrontar tu destino para poder iniciar un nuevo ciclo.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                    <button
                      onClick={() => handleStartGame(false, false, selectedGender)}
                      disabled={isLoading}
                      className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-crt-green hover:bg-crt-green/85 text-black font-bold tracking-widest uppercase rounded cursor-pointer transition-all focus:outline-none ${role === 'Administrador' ? '' : 'sm:col-span-2'}`}
                    >
                      <Play className="w-5 h-5 fill-black" />
                      {isLoading ? 'Inyectando canal...' : 'INICIAR COMPROBACIÓN'}
                    </button>
                    {role === 'Administrador' && (
                      <button
                        onClick={() => setViewingAdmin(true)}
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-crt-yellow/20 hover:bg-crt-yellow/45 text-crt-yellow border border-crt-yellow font-bold tracking-widest uppercase rounded cursor-pointer transition-all focus:outline-none glow-border-yellow"
                      >
                        <Shield className="w-5 h-5" />
                        CONSOLA ADMIN
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Info Column */}
          <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto">
            {/* Avatar HUD widget */}
            <AvatarDisplay 
              avatarUrl={avatarUrl} 
              avatarConfig={avatarConfig}
              antigravityActive={antigravityActive} 
              sanity={stats.sanity} 
            />

            {/* Tab Toggles */}
            {sessionId && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveSidebarTab('stats')}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold border transition-all ${activeSidebarTab === 'stats' ? 'bg-crt-green/20 border-crt-green text-crt-green glow-green' : 'border-crt-green/30 text-crt-dim hover:bg-crt-green/10'}`}
                >
                  📊 ESTADO HUD
                </button>
                <button 
                  onClick={() => setActiveSidebarTab('shop')}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold border transition-all ${activeSidebarTab === 'shop' ? 'bg-crt-green/20 border-crt-green text-crt-green glow-green' : 'border-crt-green/30 text-crt-dim hover:bg-crt-green/10'}`}
                >
                  🛒 CIBER-TIENDA
                </button>
              </div>
            )}

            {/* Sidebar content based on active tab */}
            {activeSidebarTab === 'stats' || !sessionId ? (
              <StatsPanel 
                stats={stats} 
                implants={implants} 
                antigravityActive={antigravityActive} 
              />
            ) : (
              <ShopPanel
                sessionId={sessionId}
                token={token}
                playerCredits={stats.credits}
                installedImplants={implants}
                onBuyItem={handleBuyItem}
                isLoading={isLoading}
              />
            )}

            {/* Unlocked Endings list panel */}
            <div className="p-4 border-2 border-crt-green bg-crt-darkgreen/40 glow-border-green flex-1 min-h-[160px]">
              <div className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-crt-green/20 pb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Finales Desbloqueados ({unlockedEndings.length})
              </div>
              
              {unlockedEndings.length === 0 ? (
                <div className="text-xs text-crt-dim italic py-2">
                  No has registrado finales. Completa una simulación.
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {unlockedEndings.map((end) => (
                    <div key={end._id} className="text-xs p-1.5 border border-crt-green/20 bg-black/40">
                      <div className="font-bold text-crt-yellow flex justify-between">
                        <span>🏆 {end.title}</span>
                        <span className="text-[9px] text-crt-dim">
                          {new Date(end.unlockedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-crt-green/80 italic mt-0.5">
                        {end.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mainframe Footer bar */}
      <footer className="mt-4 pt-2 border-t border-crt-green/30 flex justify-between items-center text-[10px] text-crt-dim tracking-wider select-none">
        <span>© NEO-BANDERSNATCH OS 2099</span>
        <div className="flex gap-4">
          <span>COGNITIVE CONTROL: ENABLED</span>
          {token && role === 'Administrador' && (
            <button 
              onClick={() => setViewingAdmin(!viewingAdmin)}
              className="hover:text-crt-yellow text-crt-green transition-colors flex items-center gap-1 uppercase font-bold"
            >
              <Shield className="w-3.5 h-3.5" /> {viewingAdmin ? 'Volver al Juego' : 'Consola Admin'}
            </button>
          )}
          {token && (
            <button 
              onClick={handleLogout}
              className="hover:text-crt-red transition-colors flex items-center gap-1 uppercase"
            >
              <LogOut className="w-3 h-3" /> Salir del Mainframe
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
