import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/dashboard').then((res) => setStats(res.data)); }, []);
  const cards = stats ? [
    ['Contatos', stats.contacts],
    ['Mensagens', stats.messages],
    ['Usuários', stats.agents],
    ['Automações', stats.automations],
    ['Auditorias', stats.audits],
    ['Financeiro', stats.financialUsers],
    ['Conexões WA', stats.whatsappConnections]
  ] : [];
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard PRO</h1>
          <p className="text-slate-400">Visão geral do CRM, atendimento e auditoria.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {cards.map(([label, value]) => <div key={label} className="rounded-3xl bg-slate-900 border border-slate-800 p-5"><div className="text-slate-400">{label}</div><div className="text-3xl font-bold mt-2">{value}</div></div>)}
        </div>
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5">
          <h2 className="text-xl font-semibold">Pipeline</h2>
          <div className="grid md:grid-cols-4 gap-4 mt-4">{(stats?.pipeline || []).map((item) => <div key={item._id} className="rounded-2xl bg-slate-800 p-4"><div className="text-slate-400">{item._id}</div><div className="text-2xl font-bold">{item.total}</div></div>)}</div>
        </div>
      </div>
    </Layout>
  );
}
