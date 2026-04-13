
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const createNode = (type = 'text') => ({ id: crypto.randomUUID(), type, content: '', options: [''] });
const nodeTypes = [
  ['text', 'Texto'],
  ['image', 'Imagem'],
  ['video', 'Vídeo'],
  ['audio', 'Áudio'],
  ['link', 'Link'],
  ['single_choice', 'Pergunta de única escolha'],
  ['payment', 'Pagamento']
];

export default function Automations() {
  const [automations, setAutomations] = useState([]);
  const [form, setForm] = useState({ name: '', keyword: '', trigger: 'keyword', nodes: [createNode()] });
  const [dragNodeId, setDragNodeId] = useState(null);
  const [dragFlowId, setDragFlowId] = useState(null);

  async function loadAutomations() {
    const { data } = await api.get('/automations');
    setAutomations(data);
  }

  useEffect(() => { loadAutomations(); }, []);

  function addNode(type = 'text') {
    setForm((current) => ({ ...current, nodes: [...current.nodes, createNode(type)] }));
  }

  function updateNode(id, patch) {
    setForm((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) }));
  }

  function removeNode(id) {
    setForm((current) => ({ ...current, nodes: current.nodes.filter((node) => node.id !== id) }));
  }

  function onDragStartNode(id) {
    setDragNodeId(id);
  }

  function onDropNode(targetId) {
    if (!dragNodeId || dragNodeId === targetId) return;
    const nodes = [...form.nodes];
    const from = nodes.findIndex((item) => item.id === dragNodeId);
    const to = nodes.findIndex((item) => item.id === targetId);
    const [moved] = nodes.splice(from, 1);
    nodes.splice(to, 0, moved);
    setForm((current) => ({ ...current, nodes }));
    setDragNodeId(null);
  }

  async function handleCreate(e) {
    e.preventDefault();
    await api.post('/automations', form);
    setForm({ name: '', keyword: '', trigger: 'keyword', nodes: [createNode()] });
    loadAutomations();
  }

  async function handleDelete(id) {
    await api.delete(`/automations/${id}`);
    loadAutomations();
  }

  async function reorderFlows(activeId, targetId) {
    if (!activeId || activeId === targetId) return;
    const items = [...automations];
    const from = items.findIndex((item) => item._id === activeId);
    const to = items.findIndex((item) => item._id === targetId);
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    setAutomations(items);
    await api.post('/automations/reorder', { items });
  }

  return (
    <Layout>
      <div className="grid lg:grid-cols-[480px_1fr] gap-6">
        <form onSubmit={handleCreate} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h1 className="text-2xl font-bold">Fluxos com arrasta e solta</h1>
          <p className="text-slate-400">Os novos fluxos entram sempre abaixo do último fluxo salvo.</p>

          <input className="w-full rounded-xl bg-slate-800 p-3" placeholder="Nome do fluxo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full rounded-xl bg-slate-800 p-3" placeholder="Palavra-chave que ativa o fluxo" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} />

          <div className="space-y-3">
            {form.nodes.map((node, index) => (
              <div
                key={node.id}
                draggable
                onDragStart={() => onDragStartNode(node.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropNode(node.id)}
                className="rounded-2xl bg-slate-800 p-4 border border-slate-700"
              >
                <div className="flex gap-2 items-center">
                  <span className="text-xs rounded-lg bg-slate-700 px-2 py-1">Bloco {index + 1}</span>
                  <select className="rounded-lg bg-slate-700 p-2" value={node.type} onChange={(e) => updateNode(node.id, { type: e.target.value })}>
                    {nodeTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <button type="button" onClick={() => removeNode(node.id)} className="ml-auto rounded-lg bg-rose-500 px-3 py-2 text-sm">Excluir bloco</button>
                </div>

                {node.type !== 'payment' && (
                  <textarea
                    className="mt-3 w-full rounded-xl bg-slate-700 p-3 min-h-[90px]"
                    placeholder={node.type === 'single_choice' ? 'Escreva a pergunta' : 'Conteúdo, URL ou descrição'}
                    value={node.content || node.question || ''}
                    onChange={(e) => updateNode(node.id, node.type === 'single_choice' ? { question: e.target.value } : { content: e.target.value })}
                  />
                )}

                {node.type === 'single_choice' && (
                  <div className="mt-3 space-y-2">
                    {(node.options || ['']).map((option, optionIndex) => (
                      <input
                        key={`${node.id}-${optionIndex}`}
                        className="w-full rounded-xl bg-slate-700 p-3"
                        placeholder={`Opção ${optionIndex + 1}`}
                        value={option}
                        onChange={(e) => {
                          const options = [...(node.options || [])];
                          options[optionIndex] = e.target.value;
                          updateNode(node.id, { options });
                        }}
                      />
                    ))}
                    <button type="button" onClick={() => updateNode(node.id, { options: [...(node.options || []), ''] })} className="rounded-xl bg-slate-700 px-4 py-2 text-sm">Adicionar opção</button>
                  </div>
                )}

                {node.type === 'payment' && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <input className="rounded-xl bg-slate-700 p-3 col-span-2" placeholder="Título do pagamento" value={node.title || ''} onChange={(e) => updateNode(node.id, { title: e.target.value })} />
                    <input className="rounded-xl bg-slate-700 p-3" placeholder="Valor" value={node.amount || ''} onChange={(e) => updateNode(node.id, { amount: e.target.value })} />
                    <input className="rounded-xl bg-slate-700 p-3" placeholder="Chave PIX" value={node.pixKey || ''} onChange={(e) => updateNode(node.id, { pixKey: e.target.value })} />
                    <input className="rounded-xl bg-slate-700 p-3 col-span-2" placeholder="Link de checkout" value={node.checkoutLink || ''} onChange={(e) => updateNode(node.id, { checkoutLink: e.target.value })} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addNode('text')} className="rounded-xl bg-slate-700 px-4 py-3">Texto</button>
            <button type="button" onClick={() => addNode('image')} className="rounded-xl bg-slate-700 px-4 py-3">Imagem</button>
            <button type="button" onClick={() => addNode('video')} className="rounded-xl bg-slate-700 px-4 py-3">Vídeo</button>
            <button type="button" onClick={() => addNode('audio')} className="rounded-xl bg-slate-700 px-4 py-3">Áudio</button>
            <button type="button" onClick={() => addNode('single_choice')} className="rounded-xl bg-slate-700 px-4 py-3">Única escolha</button>
            <button type="button" onClick={() => addNode('payment')} className="rounded-xl bg-slate-700 px-4 py-3">Pagamento</button>
          </div>

          <button className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold">Salvar fluxo</button>
        </form>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6">
          <h2 className="text-2xl font-bold">Fluxos cadastrados</h2>
          <p className="text-slate-400 mt-1">Arraste os cartões para reorganizar. O primeiro fica no topo e os novos entram embaixo.</p>
          <div className="space-y-4 mt-4">
            {automations.map((item) => (
              <div
                key={item._id}
                draggable
                onDragStart={() => setDragFlowId(item._id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => reorderFlows(dragFlowId, item._id)}
                className="rounded-2xl bg-slate-800 p-4"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-slate-400">Ativação: palavra-chave • {item.keyword || 'manual'}</div>
                  </div>
                  <button onClick={() => handleDelete(item._id)} className="ml-auto rounded-lg bg-rose-500 px-3 py-2 text-sm">Excluir permanente</button>
                </div>
                <div className="mt-3 space-y-2">
                  {item.nodes.map((node, idx) => (
                    <div key={`${item._id}-${node.id || idx}`} className="rounded-xl bg-slate-700 p-3 text-sm">
                      <strong>{nodeTypes.find(([value]) => value === node.type)?.[1] || node.type}</strong>: {node.content || node.question || node.title || node.url || '-'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
