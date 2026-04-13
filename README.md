# Sistema Agente WhatsApp SaaS — Base PostgreSQL

Esta versão migra a base do backend para **PostgreSQL** e limpa a tela de login para ficar somente com e-mail, senha e botão de acesso.

## Backend
1. Entre em `backend`
2. Copie `.env.example` para `.env`
3. Ajuste `DATABASE_URL`
4. Instale dependências:
   ```bash
   npm install
   ```
5. Rode a seed:
   ```bash
   npm run seed
   ```
6. Inicie o servidor:
   ```bash
   npm run dev
   ```

## Frontend
1. Entre em `frontend`
2. Crie `.env` com:
   ```env
   VITE_API_URL=http://localhost:4000
   ```
3. Instale dependências:
   ```bash
   npm install
   ```
4. Rode:
   ```bash
   npm run dev
   ```

## Login inicial
- E-mail: `rafaelbruceblog@gmail.com`
- Senha: `casa429`

## Variáveis importantes do backend
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_agent
JWT_SECRET=supersecret
WHATSAPP_ADMIN_NUMBER=5521998231982
WHATSAPP_ALERT_NUMBER=5521977668984
```

## Observações
- Esta entrega troca o SQLite por PostgreSQL.
- O frontend continua usando a mesma API.
- A integração real com Evolution API fica para a próxima etapa.
