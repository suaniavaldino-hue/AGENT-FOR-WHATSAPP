# Sistema Agente WhatsApp SaaS — Render + Railway + Evolution API

Esta versão foi ajustada para produção com:
- **Frontend** no Render Static Site
- **Backend** no Render Web Service
- **PostgreSQL** na Railway
- **WhatsApp** via Evolution API ou Meta Cloud API

## Backend no Render
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Variáveis mínimas:
```env
DATABASE_URL=postgresql://postgres:SENHA@HOST_PUBLICO:PORTA/railway
JWT_SECRET=troque-esta-chave
FRONTEND_URL=https://sistema-agente-whatsapp-saas.onrender.com
PGSSL=true
```

### Para Evolution API
```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave
EVOLUTION_INSTANCE_NAME=nome-da-instancia
```

### Para Meta Cloud API
```env
WHATSAPP_PROVIDER=meta
WHATSAPP_TOKEN=seu-token
WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
WHATSAPP_VERIFY_TOKEN=seu-verify-token
```

## Frontend no Render
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

Variável:
```env
VITE_API_URL=https://agent-for-whatsapp.onrender.com
```

## Banco Railway
Use a **URL pública** do PostgreSQL no Render. Não use a URL `railway.internal` quando o backend estiver fora da Railway.

## Rotas úteis
- Backend health: `/health`
- API base: `/api`
