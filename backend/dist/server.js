"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables first
dotenv_1.default.config();
const db_service_1 = require("./services/db.service");
const mssql_service_1 = require("./services/mssql.service");
const auth_controller_1 = require("./controllers/auth.controller");
const game_controller_1 = require("./controllers/game.controller");
const admin_controller_1 = require("./controllers/admin.controller");
const auth_middleware_1 = require("./middleware/auth.middleware");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5002;
// Global Middlewares
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Public Routes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
});
app.post('/api/auth/register', auth_controller_1.register);
app.post('/api/auth/login', auth_controller_1.login);
// Protected Routes
app.get('/api/auth/audit', auth_middleware_1.authenticateJWT, auth_controller_1.getAuditHistory);
app.get('/api/game/active', auth_middleware_1.authenticateJWT, game_controller_1.getActiveSession);
app.post('/api/game/start', auth_middleware_1.authenticateJWT, game_controller_1.startGame);
app.post('/api/game/command', auth_middleware_1.authenticateJWT, game_controller_1.processCommand);
app.get('/api/game/endings', auth_middleware_1.authenticateJWT, game_controller_1.getUnlockedEndings);
app.get('/api/game/shop/items', auth_middleware_1.authenticateJWT, game_controller_1.getShopItems);
app.post('/api/game/shop/buy', auth_middleware_1.authenticateJWT, game_controller_1.buyItem);
// Admin Routes
app.get('/api/admin/users', auth_middleware_1.authenticateJWT, admin_controller_1.getAllUsers);
app.get('/api/admin/roles', auth_middleware_1.authenticateJWT, admin_controller_1.getAllRoles);
app.put('/api/admin/users/:id/role', auth_middleware_1.authenticateJWT, admin_controller_1.updateUserRole);
app.put('/api/admin/users/:id/status', auth_middleware_1.authenticateJWT, admin_controller_1.updateUserStatus);
app.post('/api/admin/users', auth_middleware_1.authenticateJWT, admin_controller_1.createUser);
app.delete('/api/admin/users/:id', auth_middleware_1.authenticateJWT, admin_controller_1.deleteUser);
async function start() {
    console.log('Starting Neo-Bandersnatch Mainframe...');
    // 1. Connect and initialize SQL Server
    await (0, mssql_service_1.connectSQL)();
    // 2. Connect to MongoDB
    await (0, db_service_1.connectDB)();
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
