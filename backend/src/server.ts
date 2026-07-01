import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import { connectDB } from './services/db.service';
import { connectSQL } from './services/mssql.service';
import { register, login, getAuditHistory } from './controllers/auth.controller';
import { startGame, processCommand, getUnlockedEndings, getActiveSession, buyItem, getShopItems } from './controllers/game.controller';
import { getAllUsers, getAllRoles, updateUserRole, updateUserStatus, deleteUser, createUser } from './controllers/admin.controller';
import { authenticateJWT } from './middleware/auth.middleware';

const app = express();
const PORT = process.env.PORT || 5002;

// Global Middlewares
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Public Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Protected Routes
app.get('/api/auth/audit', authenticateJWT as any, getAuditHistory);
app.get('/api/game/active', authenticateJWT as any, getActiveSession as any);
app.post('/api/game/start', authenticateJWT as any, startGame as any);
app.post('/api/game/command', authenticateJWT as any, processCommand as any);
app.get('/api/game/endings', authenticateJWT as any, getUnlockedEndings as any);
app.get('/api/game/shop/items', authenticateJWT as any, getShopItems as any);
app.post('/api/game/shop/buy', authenticateJWT as any, buyItem as any);

// Admin Routes
app.get('/api/admin/users', authenticateJWT as any, getAllUsers as any);
app.get('/api/admin/roles', authenticateJWT as any, getAllRoles as any);
app.put('/api/admin/users/:id/role', authenticateJWT as any, updateUserRole as any);
app.put('/api/admin/users/:id/status', authenticateJWT as any, updateUserStatus as any);
app.post('/api/admin/users', authenticateJWT as any, createUser as any);
app.delete('/api/admin/users/:id', authenticateJWT as any, deleteUser as any);

async function start() {
  console.log('Starting Neo-Bandersnatch Mainframe...');
  
  // 1. Connect and initialize SQL Server
  await connectSQL();
  
  // 2. Connect to MongoDB
  await connectDB();

  // 3. Listen to incoming requests
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`[Neo-Bandersnatch Server] Running on port ${PORT}`);
    console.log(`[API Base URL] http://localhost:${PORT}`);
    console.log(`========================================================`);
  });
}

start().catch(err => {
  console.error('[Mainframe Start Error] Critical boot error:', err);
  process.exit(1);
});
