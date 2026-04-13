
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const columns = [['novo_lead', 'Novo lead'], ['em_atendimento', 'Em atendimento'], ['proposta', 'Proposta'], ['fechado', 'Fechado']];

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [dragContactId, setDragContactId] = useState(null);

  async function loadContacts() {
    const { data } = await api.get('/contacts');
    setContacts(data);
  }

  async function moveContact(contactId, status) {
    await api.put(`/contacts/${contactId}`, { status });
    loadContacts();
  }

  useEffect(() => { loadContacts(); }, []);

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold">CRM</h1>
        <p className="text-slate-400">Arraste o lead entre as colunas para atualizar o estágio automaticamente.</p>
        <div className="grid md:grid-cols-4 gap-4 mt-6">
          {columns.map(([key, label]) => {
            const filtered = contacts.filter((item) => item.status === key);
            return (
              <div
                key={key}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-4 min-h-[400px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragContactId && moveContact(dragContactId, key)}
              >
                <div className="font-semibold text-lg">{label}</div>
                <div className="text-sm text-slate-400">{filtered.length} lead(s)</div>
                <div className="space-y-3 mt-4">
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
