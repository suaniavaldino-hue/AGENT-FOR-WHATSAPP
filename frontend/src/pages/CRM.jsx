import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const columns = [['novo_lead', 'Novo lead'], ['em_atendimento', 'Em atendimento'], ['proposta', 'Proposta'], ['fechado', 'Fechado']];
const initialForm = { name: '', phone: '', email: '', tags: '' };

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [dragContactId, setDragContactId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function loadContacts() {
    const { data } = await api.get('/contacts');
    setContacts(data);
  }

  async function moveContact(contactId, status) {
    await api.put(`/contacts/${contactId}`, { status });
    loadContacts();
  }

  async function createLead(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      await api.post('/contacts', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
        status: 'novo_lead'
      });
      setForm(initialForm);
      setFeedback('Lead criado com sucesso.');
      loadContacts();
    } catch (error) {
      setFeedback(error?.response?.data?.message || 'Não foi possível criar o lead.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { loadContacts(); }, []);

  const totals = useMemo(() => columns.reduce((acc, [key]) => ({ ...acc, [key]: contacts.filter((item) => item.status === key).length }), {}), [contacts]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">CRM</h1>
            <p className="text-slate-400">Agora o CRM não fica mais vazio: você pode criar leads manualmente e arrastar entre as etapas do funil.</p>
          </div>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-slate-300">
            Total de contatos: <strong className="text-white">{contacts.length}</strong>
          </div>
        </div>

        <form onSubmit={createLead} className="rounded-3xl bg-slate-900 border border-slate-800 p-5 grid md:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Nome</label>
            <input className="w-full rounded-xl bg-slate-800 p-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: João Silva" required />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">WhatsApp</label>
            <input className="w-full rounded-xl bg-slate-800 p-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="5511999999999" required />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">E-mail / Tags</label>
            <div className="space-y-2">
              <input className="w-full rounded-xl bg-slate-800 p-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="cliente@email.com" />
              <input className="w-full rounded-xl bg-slate-800 p-3" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="quente, vip, orçamento" />
            </div>
          </div>
          <button disabled={saving} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold disabled:opacity-50">{saving ? 'Salvando...' : 'Criar lead'}</button>
          {feedback && <div className="md:col-span-4 text-sm text-slate-300">{feedback}</div>}
        </form>

        <div className="grid md:grid-cols-4 gap-4">
          {columns.map(([key, label]) => {
            const filtered = contacts.filter((item) => item.status === key);
            return (
              <div
                key={key}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-4 min-h-[420px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragContactId && moveContact(dragContactId, key)}
              >
                <div className="font-semibold text-lg">{label}</div>
                <div className="text-sm text-slate-400">{totals[key] || 0} lead(s)</div>
                <div className="space-y-3 mt-4">
                  {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">Nenhum lead nesta etapa.</div>}
                  {filtered.map((contact) => (
                    <div
                      key={contact._id}
                      draggable
                      onDragStart={() => setDragContactId(contact._id)}
                      className="rounded-2xl bg-slate-800 p-4 cursor-move"
                    >
                      <div className="font-semibold">{contact.name}</div>
                      <div className="text-sm text-slate-400">{contact.phone}</div>
                      <div className="text-xs text-emerald-400 mt-1">Atendente: {contact.assignedTo?.fullName || 'Não atribuído'} {contact.assignedTo?.position ? `• ${contact.assignedTo.position}` : ''}</div>
                      {contact.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{contact.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-700 px-2 py-1 text-[11px]">{tag}</span>)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
