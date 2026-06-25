import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, ArrowLeft, Shield, AlertTriangle, Terminal as TermIcon, User as UserIcon } from 'lucide-react';

interface UserRow {
  UsuarioID: number;
  NombreUsuario: string;
  Email: string;
  Estado: 'ACTIVO' | 'BLOQUEADO' | 'INACTIVO';
  FechaRegistro: string;
  UltimoAcceso: string | null;
  RolID: number;
  NombreRol: string;
}

interface RoleRow {
  RolID: number;
  NombreRol: string;
  Descripcion: string | null;
}

interface AuditRow {
  _id: number;
  eventType: string;
  detail: string;
  eventDate: string;
  ipAddress: string;
  userId: {
    _id: number;
    username: string;
    email: string;
  };
}

interface AdminPanelProps {
  token: string;
  onClose: () => void;
}

const API_BASE = 'http://localhost:5002/api';

export function AdminPanel({ token, onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for creating a new user
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState<number>(0);
  const [newStatus, setNewStatus] = useState('ACTIVO');

  // Set default role ID when roles are loaded
  useEffect(() => {
    if (roles.length > 0 && !newRoleId) {
      setNewRoleId(roles[0].RolID);
    }
  }, [roles, newRoleId]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          roleId: newRoleId,
          status: newStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear operario');

      setSuccessMsg(`Operario [${newUsername}] creado y registrado exitosamente con rol [${data.user.NombreRol}].`);
      
      // Add the new user to state list
      setUsers(prev => [...prev, data.user]);
      
      // Clear form inputs and close form
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setShowCreateForm(false);

      // Refresh audits
      fetchAudits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all initial data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch users
      const usersRes = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersRes.ok) throw new Error('Error al cargar la lista de operarios');
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Fetch roles
      const rolesRes = await fetch(`${API_BASE}/admin/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!rolesRes.ok) throw new Error('Error al cargar la lista de roles');
      const rolesData = await rolesRes.json();
      setRoles(rolesData);

      // Fetch audit logs
      const auditsRes = await fetch(`${API_BASE}/auth/audit`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!auditsRes.ok) throw new Error('Error al cargar el registro de auditoría');
      const auditsData = await auditsRes.json();
      setAudits(auditsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle status update
  const handleUpdateStatus = async (userId: number, newStatus: string) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el estado del usuario');

      setSuccessMsg(`Estado del operario #${userId} actualizado a ${newStatus} correctamente.`);
      
      // Update local state
      setUsers(prev => prev.map(u => u.UsuarioID === userId ? { ...u, Estado: newStatus as any } : u));
      
      // Refresh audit logs
      fetchAudits();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle role update
  const handleUpdateRole = async (userId: number, newRoleId: number) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roleId: newRoleId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el rol del usuario');

      const updatedRole = roles.find(r => r.RolID === newRoleId);
      setSuccessMsg(`Rol del operario #${userId} actualizado a [${updatedRole?.NombreRol}] correctamente.`);
      
      // Update local state
      setUsers(prev => prev.map(u => u.UsuarioID === userId ? { ...u, RolID: newRoleId, NombreRol: updatedRole?.NombreRol || '' } : u));
      
      // Refresh audit logs
      fetchAudits();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`⚠️ ALERTA CRÍTICA: ¿Estás seguro de que deseas ELIMINAR permanentemente al operario [${username}] de la base de datos?\n\nEsta acción es irreversible y purgará todas sus partidas, logs de decisiones y finales desbloqueados en MongoDB de manera automática.`)) {
      return;
    }

    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar operario');

      setSuccessMsg(`Operario [${username}] eliminado con éxito junto con todo su historial de simulación.`);
      
      // Update local state
      setUsers(prev => prev.filter(u => u.UsuarioID !== userId));
      
      // Refresh audit logs
      fetchAudits();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Helper to refresh audits separately
  const fetchAudits = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/audit`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAudits(data);
      }
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden relative crt-screen">
      <div className="scanline-animation" />

      {/* Admin Panel Header */}
      <div className="flex justify-between items-center border-b border-crt-green/40 pb-2 select-none">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-crt-yellow glow-yellow" />
          <span className="font-extrabold tracking-widest text-sm uppercase text-crt-green glow-green">
            NEO-BANDERSNATCH OS v4.99 // CONSOLA DE ADMINISTRADOR
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-1 px-3 border border-crt-green/40 hover:bg-crt-green/10 text-xs text-crt-green rounded font-mono flex items-center gap-1 transition-all"
            title="Refrescar consola"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESCAR
          </button>
          
          <button
            onClick={onClose}
            className="p-1 px-3 border border-crt-red/50 hover:bg-crt-red/25 text-xs text-crt-red rounded font-mono flex items-center gap-1 transition-all glow-border-red"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            VOLVER AL JUEGO
          </button>
        </div>
      </div>

      {/* Messages Board */}
      {error && (
        <div className="p-2.5 border border-crt-red bg-crt-red/10 text-crt-red text-xs font-mono font-bold glow-red rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>ERROR DE ACCESO: {error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-2.5 border border-crt-green bg-crt-green/10 text-crt-green text-xs font-mono font-bold glow-green rounded flex items-center gap-2">
          <TermIcon className="w-4 h-4 shrink-0" />
          <span>EJECUCIÓN CORRECTA: {successMsg}</span>
        </div>
      )}

      {/* Main Admin Content Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 overflow-hidden">
        
        {/* Users Table Column - takes 2 cols on xl */}
        <div className="xl:col-span-2 border-2 border-crt-green bg-black/90 rounded p-4 flex flex-col overflow-hidden glow-border-green">
          <div className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b border-crt-green/20 flex items-center justify-between select-none">
            <div className="flex items-center gap-1">
              <UserIcon className="w-4 h-4" /> Gestión de Operarios y Nodos ({users.length})
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="p-1 px-2 border border-crt-green/40 hover:bg-crt-green/10 text-[10px] text-crt-green rounded font-mono transition-all focus:outline-none focus:ring-0 cursor-pointer"
            >
              {showCreateForm ? '[-] CANCELAR NUEVO' : '[+] NUEVO OPERARIO'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="mb-4 p-3 border border-crt-green/30 bg-crt-darkgreen/10 rounded space-y-3 font-mono text-xs select-text">
              <div className="text-crt-yellow font-bold uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                📡 INYECTAR NUEVA IDENTIDAD DE OPERARIO
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] uppercase text-crt-dim mb-1 font-bold">Nombre de Operario</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-black border border-crt-green/45 text-crt-green text-xs rounded outline-none p-1.5 focus:border-crt-green font-mono"
                    placeholder="Ej. deckard"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-crt-dim mb-1 font-bold">Email del Nodo</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-black border border-crt-green/45 text-crt-green text-xs rounded outline-none p-1.5 focus:border-crt-green font-mono"
                    placeholder="Ej. deckard@tyrell.corp"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-crt-dim mb-1 font-bold">Contraseña Encriptada</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black border border-crt-green/45 text-crt-green text-xs rounded outline-none p-1.5 focus:border-crt-green font-mono"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-crt-dim mb-1 font-bold">Rol en el Mainframe</label>
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(parseInt(e.target.value))}
                    className="w-full bg-black border border-crt-green/45 text-crt-green text-xs rounded outline-none p-1.5 focus:border-crt-green font-mono cursor-pointer"
                  >
                    {roles.map(r => (
                      <option key={r.RolID} value={r.RolID} className="bg-black text-crt-green">{r.NombreRol}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-crt-dim mb-1 font-bold">Estado Operativo</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-black border border-crt-green/45 text-crt-green text-xs rounded outline-none p-1.5 focus:border-crt-green font-mono cursor-pointer"
                  >
                    <option value="ACTIVO" className="bg-black text-crt-green">ACTIVO</option>
                    <option value="BLOQUEADO" className="bg-black text-crt-red">BLOQUEADO</option>
                    <option value="INACTIVO" className="bg-black text-crt-dim">INACTIVO</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-1.5 bg-crt-green hover:bg-crt-green/85 text-black font-extrabold tracking-widest uppercase transition-all rounded text-xs cursor-pointer"
                  >
                    {isLoading ? 'CREANDO...' : 'INYECTAR OPERARIO'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-crt-green/30 text-crt-dim bg-crt-darkgreen/30 select-none">
                  <th className="py-2 px-1 text-center">ID</th>
                  <th className="py-2 px-2">Operario</th>
                  <th className="py-2 px-2">Email</th>
                  <th className="py-2 px-2">Rol Asignado</th>
                  <th className="py-2 px-2">Estado</th>
                  <th className="py-2 px-2">Último Acceso</th>
                  <th className="py-2 px-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crt-green/10">
                {users.map((u) => (
                  <tr key={u.UsuarioID} className="hover:bg-crt-green/5 transition-colors">
                    <td className="py-2 px-1 text-center font-bold text-crt-yellow">
                      {u.UsuarioID}
                    </td>
                    <td className="py-2 px-2 font-bold text-crt-green">
                      {u.NombreUsuario}
                    </td>
                    <td className="py-2 px-2 text-crt-green/80">
                      {u.Email}
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={u.RolID || ''}
                        onChange={(e) => handleUpdateRole(u.UsuarioID, parseInt(e.target.value))}
                        className="bg-black border border-crt-green/35 text-crt-green text-[11px] rounded outline-none font-mono py-0.5 px-2 cursor-pointer focus:border-crt-green"
                      >
                        {roles.map(r => (
                          <option key={r.RolID} value={r.RolID}>
                            {r.NombreRol}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={u.Estado}
                        onChange={(e) => handleUpdateStatus(u.UsuarioID, e.target.value)}
                        className={`bg-black border rounded text-[11px] outline-none font-mono py-0.5 px-2 cursor-pointer focus:border-crt-green ${
                          u.Estado === 'ACTIVO' ? 'border-crt-green text-crt-green' :
                          u.Estado === 'BLOQUEADO' ? 'border-crt-red text-crt-red font-bold' :
                          'border-crt-dim text-crt-dim'
                        }`}
                      >
                        <option value="ACTIVO" className="text-crt-green">ACTIVO</option>
                        <option value="BLOQUEADO" className="text-crt-red">BLOQUEADO</option>
                        <option value="INACTIVO" className="text-crt-dim">INACTIVO</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-[10px] text-crt-dim">
                      {u.UltimoAcceso ? new Date(u.UltimoAcceso).toLocaleString() : 'NUNCA'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => handleDeleteUser(u.UsuarioID, u.NombreUsuario)}
                        className="p-1 border border-crt-red/40 hover:bg-crt-red/20 text-crt-red hover:text-white rounded transition-all focus:outline-none"
                        title="Eliminar operario permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs Column - takes 1 col */}
        <div className="border-2 border-crt-green bg-black/90 rounded p-4 flex flex-col overflow-hidden glow-border-green">
          <div className="text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b border-crt-green/20 flex items-center gap-1">
            <TermIcon className="w-4 h-4 text-crt-yellow glow-yellow" /> Registro de Auditoría de Red
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 pr-1">
            {audits.map((a) => (
              <div 
                key={a._id} 
                className={`p-2 border rounded border-crt-green/25 bg-crt-darkgreen/10 ${
                  a.eventType.includes('BLOQUEO') ? 'border-crt-red/40 bg-crt-red/5' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-bold uppercase ${
                    a.eventType.includes('BLOQUEO') ? 'text-crt-red' : 'text-crt-yellow'
                  }`}>
                    ⚡ {a.eventType}
                  </span>
                  <span className="text-crt-dim">
                    {new Date(a.eventDate).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-crt-green/80 leading-normal mb-1">
                  {a.detail}
                </p>
                <div className="text-[9px] text-crt-dim flex justify-between border-t border-crt-green/10 pt-1 mt-1">
                  <span>Operario: {a.userId?.username || 'N/A'} (ID: {a.userId?._id || '?'})</span>
                  <span>IP: {a.ipAddress}</span>
                </div>
              </div>
            ))}
            {audits.length === 0 && (
              <div className="text-xs text-crt-dim italic py-2 text-center">
                Consola vacía. No hay logs de auditoría registrados.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
