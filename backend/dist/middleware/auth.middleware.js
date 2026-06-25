"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cyberpunk_token_key_2099';
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        // Expected format: Bearer <token>
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Acceso no autorizado: Formato de token incorrecto' });
        }
        jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Acceso prohibido: Token inválido o expirado' });
            }
            req.user = user;
            next();
        });
    }
    else {
        res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado' });
    }
}
