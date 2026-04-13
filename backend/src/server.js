import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import { setSocket } from './services/socket.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import automationRoutes from './routes/automationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

setSocket(io);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/', (_, res) => {
  res.send('API WhatsApp Agent ONLINE 🚀');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/audits', auditRoutes);

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ message: err.message || 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 4000;
let shuttingDown = false;

async function start() {
  await connectDB(process.env.DATABASE_URL);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Recebido ${signal}. Encerrando servidor...`);
  try {
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  } catch (error) {
    console.error('Erro ao encerrar servidor:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start().catch((error) => {
  console.error('Erro ao iniciar servidor:', error);
  process.exit(1);
});
