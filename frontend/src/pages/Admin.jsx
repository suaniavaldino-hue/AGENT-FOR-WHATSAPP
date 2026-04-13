
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const emptyForm = {
  name: '',
  surname: '',
  email: '',
  password: '',
  role: 'usuario',
  cpf: '',
  whatsapp: '',
  workplace: 'SpicyMidia',
  isFinanceiro: false
};

const roleOptions = [
  ['admin', 'Administrador'],
  ['usuario', 'Usuário'],
  ['funcionario', 'Funcionário']
];

const workplaceOptions = ['GRAFFITI BAR KARAOKE', 'SpicyMidia'];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [audits, setAudits] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function loadData() {
    const [{ data: userData }, { data: auditData }] = await Promise.all([
      api.get('/users'),
      api.get('/audits')
    ]);
    setUsers(userData);
    setAudits(auditData);
  }

  useEffect(() => { loadData(); }, []);

  function roleToPosition(role) {
    return roleOptions.find(([value]) => value === role)?.[1] || 'Usuário';
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, position: roleToPosition(form.role) };
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setEditingId(null);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar usuário');
    }
  }

  function editUser(user) {
    setEditingId(user._id);
    setForm({
      name: user.name,
      surname: user.surname,
      email: user.email,
      password: '',
      role: user.role,
      cpf: user.cpf,
      whatsapp: user.whatsapp,
      workplace: user.workplace,
      isFinanceiro: !!user.isFinanceiro
    });
  }

  return (
    <Layout>
      <div className="grid lg:grid-cols-[460px_1fr] gap-6">
        <form onSubmit={submit} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h1 className="text-2xl font-bold">Área administrativa</h1>
          <p className="text-slate-400">Cadastre administradores, usuários e funcionários com validação brasileira.</p>

          <div className="grid md:grid-cols-2 gap-3">
            <input className="rounded-xl bg-slate-800 p-3" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="rounded-xl bg-slate-800 p-3" placeholder="Sobrenome" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
            <input className="rounded-xl bg-slate-800 p-3" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="password" className="rounded-xl bg-slate-800 p-3" placeholder="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select className="rounded-xl bg-slate-800 p-3" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input className="rounded-xl bg-slate-800 p-3" placeholder="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            <input className="rounded-xl bg-slate-800 p-3" placeholder="WhatsApp com DDD" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            <select className="rounded-xl bg-slate-800 p-3" value={form.workplace} onChange={(e) => setForm({ ...form, workplace: e.target.value })}>
              {workplaceOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFinanceiro} onChange={(e) => setForm({ ...form, isFinanceiro: e.target.checked })} />
            Responsável financeiro
          </label>

          {error && <div className="text-rose-400 text-sm">{error}</div>}

          <div className="flex gap-3">
            <button className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold">{editingId ? 'Atualizar conta' : 'Criar conta'}</button>
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-xl bg-slate-700 px-4 py-3">Limpar</button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
            <h2 className="text-2xl font-bold">Contas cadastradas</h2>
            <div className="space-y-3 mt-4">
              {users.map((user) => (
                <div key={user._id} className="rounded-2xl bg-slate-800 p-4 flex items-center gap-3">
                  <div>
                    <div className="font-semibold">{user.fullName}</div>
                    <div className="text-sm text-slate-400">{roleToPosition(user.role)} • {user.workplace}</div>
                    <div className="text-xs text-slate-500">CPF: {user.cpf} • WhatsApp: {user.whatsapp}</div>
                  </div>
                  <button onClick={() => editUser(user)} className="ml-auto rounded-lg bg-slate-700 px-3 py-2 text-sm">Editar</button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
            <h2 className="text-2xl font-bold">Auditoria de alterações</h2>
            <div className="space-y-3 mt-4 max-h-[420px] overflow-auto">
              {audits.map((log) => (
                <div key={log._id} className="rounded-2xl bg-slate-800 p-4">
                  <div className="font-semibold">{log.changedByName || 'Sistema'} • {log.action}</div>
                  <div className="text-sm text-slate-400">{log.entityType} #{log.entityId} • Campo: {log.field || 'geral'}</div>
                  <div className="text-xs text-slate-500 mt-1">Antes: {log.beforeValue || '-'} | Depois: {log.afterValue || '-'}</div>
                  <div className="text-xs text-emerald-400 mt-1">{new Date(log.createdAt).toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
