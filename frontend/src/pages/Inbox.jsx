
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import Layout from '../components/Layout';
import api, { getSocketBaseUrl } from '../services/api';

const socket = io(getSocketBaseUrl(), { transports: ['websocket', 'polling'] });

function formatMessageType(type) {
  const map = {
    text: 'Texto',
    image: 'Imagem',
    video: 'Vídeo',
    audio: 'Áudio',
    link: 'Link',
    single_choice: 'Única escolha',
    payment: 'Pagamento',
    payment_status: 'Status do pagamento'
  };
  return map[type] || type;
}

function computeResponseTime(messages, currentIndex) {
  const current = messages[currentIndex];
  if (!current || current.direction !== 'outbound') return '';
  for (let i = currentIndex - 1; i >= 0; i -= 1) {
    if (messages[i].direction === 'inbound') {
      const start = new Date(messages[i].createdAt).getTime();
      const end = new Date(current.createdAt).getTime();
      const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
      return diffMinutes <= 1 ? 'Tempo de resposta: até 1 min' : `Tempo de resposta: ${diffMinutes} min`;
    }
  }
  return '';
}

export default function Inbox() {
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [type, setType] = useState('text');

  async function loadBase() {
    const [{ data: contactsData }, usersRes] = await Promise.all([
      api.get('/contacts'),
      api.get('/users').catch(() => ({ data: [] }))
    ]);
    setContacts(contactsData);
    setUsers(usersRes.data || []);
    if (!selected && contactsData.length) setSelected(contactsData[0]);
  }

  async function loadMessages(contactId) {
    const { data } = await api.get(`/contacts/${contactId}/messages`);
    setMessages(data);
  }

  async function handleSend() {
    if (!selected) return;
    const cleanText = text.trim();
    if (!cleanText) return;
    const payload = ['image', 'video', 'audio', 'link'].includes(type)
      ? { contactId: selected._id, type, text: cleanText, meta: { url: cleanText } }
      : { contactId: selected._id, type, text: cleanText };
    await api.post('/messages/send', payload);
    setText('');
    setType('text');
    loadMessages(selected._id);
    loadBase();
  }

  async function assignContact(userId) {
    if (!selected) return;
    await api.put(`/contacts/${selected._id}`, { assignedTo: userId });
    loadBase();
  }

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { if (selected?._id) loadMessages(selected._id); }, [selected?._id]);
  useEffect(() => {
    socket.on('conversation:update', ({ contactId, messages: newMessages }) => {
      if (selected?._id === contactId) setMessages(newMessages);
      loadBase();
    });
    return () => socket.off('conversation:update');
  }, [selected?._id]);

  const selectedContact = useMemo(() => contacts.find((c) => c._id === selected?._id) || selected, [contacts, selected]);

  return (
    <Layout>
      <div className="grid grid-cols-[320px_1fr_320px] gap-4 h-[calc(100vh-48px)]">
        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-auto">
          <div className="p-4 border-b border-slate-800 text-lg font-semibold">Conversas</div>
          {contacts.map((contact) => (
            <button key={contact._id} onClick={() => setSelected(contact)} className="w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800">
              <div className="font-semibold">{contact.name}</div>
              <div className="text-sm text-slate-400">{contact.phone}</div>
              <div className="text-xs text-emerald-400 mt-1">{contact.status} • {contact.assignedTo?.fullName || 'Sem atendente'}</div>
              {contact.tags?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{contact.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-700 px-2 py-1 text-[11px]">{tag}</span>)}</div>}
            </button>
          ))}
        </div>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 font-semibold">{selectedContact?.name || 'Selecione uma conversa'}</div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div key={message._id} className={`max-w-[75%] rounded-2xl p-3 ${message.direction === 'outbound' ? 'bg-emerald-500 ml-auto' : 'bg-slate-800'}`}>
                <div className="text-xs opacity-80">{message.senderUserName || message.senderType} {message.senderUserPosition ? `• ${message.senderUserPosition}` : ''}</div>
                <div className="whitespace-pre-wrap">{message.text}</div>
                {message.meta?.url && <a className="text-xs underline mt-2 inline-block" href={message.meta.url} target="_blank" rel="noreferrer">Abrir mídia/link</a>}
                {message.meta?.options?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.meta.options.map((option) => <span key={option} className="rounded-full bg-black/20 px-3 py-1 text-xs">{option}</span>)}
                  </div>
                )}
                <div className="text-[11px] mt-1 opacity-75">{formatMessageType(message.type)}</div>
                <div className="text-[11px] opacity-75">{new Date(message.createdAt).toLocaleString('pt-BR')}</div>
                {computeResponseTime(messages, index) && <div className="text-[11px] opacity-90">{computeResponseTime(messages, index)}</div>}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-800 space-y-3">
            <div className="flex gap-3">
              <select className="rounded-xl bg-slate-800 p-3" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="text">Texto</option>
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio</option>
                <option value="link">Link</option>
              </select>
              <input className="flex-1 rounded-xl bg-slate-800 p-3" value={text} onChange={(e) => setText(e.target.value)} placeholder={type === 'text' ? 'Digite a mensagem...' : 'Cole a URL ou descrição...'} />
              <button onClick={handleSend} className="rounded-xl bg-emerald-500 px-5 font-semibold">Enviar</button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <h2 className="text-xl font-semibold">Cliente</h2>
          {selectedContact ? (
            <>
              <div className="rounded-2xl bg-slate-800 p-4">
                <div className="font-semibold">{selectedContact.name}</div>
                <div className="text-sm text-slate-400">{selectedContact.phone}</div>
                <div className="text-sm text-slate-400">{selectedContact.email || 'Sem e-mail'}</div>
              </div>

              <div className="rounded-2xl bg-slate-800 p-4">
                <div className="font-semibold mb-3">Atendente responsável</div>
                <select className="w-full rounded-xl bg-slate-700 p-3" value={selectedContact.assignedTo?._id || ''} onChange={(e) => assignContact(e.target.value)}>
                  <option value="">Sem atendente</option>
                  {users.map((user) => <option key={user._id} value={user._id}>{user.fullName} • {user.position}</option>)}
                </select>
              </div>

              <div className="rounded-2xl bg-slate-800 p-4">
                <div className="font-semibold mb-3">Tags do CRM</div>
                <div className="flex flex-wrap gap-2">
                  {(selectedContact.tags || []).map((tag) => <span key={tag} className="rounded-full bg-slate-700 px-3 py-1 text-xs">{tag}</span>)}
                  {(!selectedContact.tags || selectedContact.tags.length === 0) && <span className="text-sm text-slate-400">Ainda sem tags</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-400">Selecione uma conversa para ver os detalhes.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
