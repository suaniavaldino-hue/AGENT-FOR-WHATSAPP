
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const roleLabels = {
  admin: 'Administrador',
  usuario: 'Usuário',
  funcionario: 'Funcionário'
};

export default function Sidebar() {
  const { logout, user } = useAuth();
  const links = [
    ['/', 'Painel'],
    ['/inbox', 'Atendimento'],
    ['/crm', 'CRM'],
    ['/automations', 'Fluxos'],
    ['/connections', 'Conexões WhatsApp'],
    ...(user?.role === 'admin' ? [['/admin', 'Administração']] : [])
  ];
  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col gap-4">
      <div>
        <div className="text-2xl font-bold">SpicyMidia CRM PRO</div>
        <div className="text-sm text-slate-400">Multiatendente • Auditoria • WhatsApp</div>
      </div>
      <nav className="flex flex-col gap-2">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `rounded-xl px-4 py-3 transition ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{label}</NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl bg-slate-800 p-4 space-y-1">
        <div className="font-semibold">{user?.fullName || user?.name}</div>
        <div className="text-sm text-slate-400">{user?.position} • {roleLabels[user?.role] || user?.role}</div>
        <div className="text-xs text-slate-500">{user?.workplace}</div>
        <button onClick={logout} className="mt-3 w-full rounded-xl bg-rose-500 px-4 py-2 font-medium">Sair</button>
      </div>
    </aside>
  );
}
