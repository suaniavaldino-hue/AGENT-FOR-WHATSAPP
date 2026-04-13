
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const modeLabels = {
  cloud_api: 'Cloud API oficial',
  phone_number: 'Entrar com número e código',
  qr_code: 'QR Code'
};

const statusLabels = {
  pending: 'Pendente',
  conectado: 'Conectado',
  'aguardando_confirmação': 'Aguardando confirmação',
  'código_enviado': 'Código enviado'
};

export default function Connections() {
  const [connections, setConnections] = useState([]);
  const [cloudForm, setCloudForm] = useState({ connectionName: '', mode: 'cloud_api', phoneNumber: '', webhookUrl: '' });
  const [accessForm, setAccessForm] = useState({ connectionName: '', phoneNumber: '', accessCode: '' });
  const [feedback, setFeedback] = useState('');

  async function loadData() {
    const { data } = await api.get('/connections');
    setConnections(data);
  }

  useEffect(() => { loadData(); }, []);

  async function submitCloud(e) {
    e.preventDefault();
    setFeedback('');
    await api.post('/connections', cloudForm);
    setCloudForm({ connectionName: '', mode: 'cloud_api', phoneNumber: '', webhookUrl: '' });
    loadData();
    setFeedback('Conexão criada com sucesso.');
  }

  async function sendAccessCode(e) {
    e.preventDefault();
    setFeedback('');
    const { data } = await api.post('/connections/request-access-code', {
      connectionName: accessForm.connectionName || 'Conta por número',
      phoneNumber: accessForm.phoneNumber
    });
    setFeedback(
      data.mocked
        ? `Modo teste: o código foi gerado e ficou salvo no sistema.`
        : 'Código enviado para o WhatsApp informado.'
    );
    loadData();
  }

  async function confirmAccessCode(e) {
    e.preventDefault();
    setFeedback('');
    await api.post('/connections/confirm-access-code', {
      phoneNumber: accessForm.phoneNumber,
      accessCode: accessForm.accessCode
    });
    setAccessForm({ connectionName: '', phoneNumber: '', accessCode: '' });
    loadData();
    setFeedback('Número conectado com sucesso.');
  }

  return (
    <Layout>
      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <div className="space-y-6">
          <form onSubmit={sendAccessCode} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h1 className="text-2xl font-bold">Entrar com número do WhatsApp</h1>
            <p className="text-slate-400">Digite o número com DDD. O sistema gera um código de acesso e envia pelo WhatsApp quando a API oficial estiver configurada.</p>
            <input className="w-full rounded-xl bg-slate-800 p-3" placeholder="Nome da conexão" value={accessForm.connectionName} onChange={(e) => setAccessForm({ ...accessForm, connectionName: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-800 p-3" placeholder="Número do WhatsApp com DDD" value={accessForm.phoneNumber} onChange={(e) => setAccessForm({ ...accessForm, phoneNumber: e.target.value })} />
            <button className="w-full rounded-xl bg-emerald-500 p-3 font-semibold">Enviar código de acesso</button>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <input className="w-full rounded-xl bg-slate-800 p-3" placeholder="Digite o código recebido" value={accessForm.accessCode} onChange={(e) => setAccessForm({ ...accessForm, accessCode: e.target.value })} />
              <button type="button" onClick={confirmAccessCode} className="w-full rounded-xl bg-sky-600 p-3 font-semibold">Confirmar código e conectar</button>
            </div>
          </form>

          <form onSubmit={submitCloud} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h2 className="text-2xl font-bold">Cloud API oficial</h2>
            <p className="text-slate-400">Use esta opção quando já tiver token da Meta, número comercial e webhook público.</p>
            <input className="w-full rounded-xl bg-slate-800 p-3" placeholder="Nome da conexão" value={cloudForm.connectionName} onChange={(e) => setCloudForm({ ...cloudForm, connectionName: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-800 p-3" placeholder="Número principal do WhatsApp" value={cloudForm.phoneNumber} onChange={(e) => setCloudForm({ ...cloudForm, phoneNumber: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-800 p-3" placeholder="Webhook público" value={cloudForm.webhookUrl} onChange={(e) => setCloudForm({ ...cloudForm, webhookUrl: e.target.value })} />
            <button className="w-full rounded-xl bg-emerald-500 p-3 font-semibold">Salvar conexão oficial</button>
          </form>

          {feedback && <div className="rounded-2xl bg-slate-900 border border-emerald-500/30 p-4 text-emerald-300">{feedback}</div>}
        </div>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
          <h2 className="text-2xl font-bold">Contas conectadas</h2>
          <div className="space-y-4 mt-4">
            {connections.map((item) => (
              <div key={item._id} className="rounded-2xl bg-slate-800 p-4">
                <div className="font-semibold">{item.connectionName}</div>
                <div className="text-sm text-slate-400">{item.userName} • {modeLabels[item.mode] || item.mode} • {statusLabels[item.status] || item.status}</div>
                <div className="text-xs text-slate-500">{item.phoneNumber || 'Sem número'} {item.webhookUrl ? `• ${item.webhookUrl}` : ''}</div>
                {item.notes && <div className="mt-2 text-xs text-slate-400">{item.notes}</div>}
                {item.pairingCode && item.status !== 'conectado' && (
                  <div className="mt-3 rounded-xl bg-slate-700 p-3 text-sm">Código atual: <strong>{item.pairingCode}</strong></div>
                )}
                {item.qrCode && <img src={item.qrCode} alt="QR Code" className="mt-3 h-40 w-40 rounded-xl border border-slate-700" />}
                {item.connectedAt && <div className="mt-2 text-xs text-emerald-400">Conectado em {new Date(item.connectedAt).toLocaleString('pt-BR')}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
