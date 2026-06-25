"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = getAllUsers;
exports.getAllRoles = getAllRoles;
exports.updateUserRole = updateUserRole;
exports.updateUserStatus = updateUserStatus;
exports.deleteUser = deleteUser;
exports.createUser = createUser;
const mssql_1 = __importDefault(require("mssql"));
const mssql_service_1 = require("../services/mssql.service");
const models_1 = require("../models/models");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function getAllUsers(req, res) {
    const user = req.user;
    if (user?.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso prohibido: Se requieren privilegios de Administrador' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        const result = await pool.request().query(`
      SELECT U.UsuarioID, U.NombreUsuario, U.Email, U.Estado, U.FechaRegistro, U.UltimoAcceso, R.RolID, R.NombreRol
      FROM Usuarios U
      LEFT JOIN UsuarioRoles UR ON U.UsuarioID = UR.UsuarioID
      LEFT JOIN Roles R ON UR.RolID = R.RolID
      ORDER BY U.UsuarioID ASC
    `);
        return res.status(200).json(result.recordset);
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al recuperar usuarios', details: error.message });
    }
}
async function getAllRoles(req, res) {
    const user = req.user;
    if (user?.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso prohibido: Se requieren privilegios de Administrador' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        const result = await pool.request().query('SELECT RolID, NombreRol, Descripcion FROM Roles ORDER BY RolID ASC');
        return res.status(200).json(result.recordset);
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al recuperar roles', details: error.message });
    }
}
async function updateUserRole(req, res) {
    const user = req.user;
    if (user?.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso prohibido: Se requieren privilegios de Administrador' });
    }
    const { id } = req.params;
    const { roleId } = req.body;
    if (!roleId) {
        return res.status(400).json({ error: 'El ID de rol es requerido' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        const existing = await pool.request()
            .input('usuarioId', mssql_1.default.Int, id)
            .query('SELECT RolID FROM UsuarioRoles WHERE UsuarioID = @usuarioId');
        if (existing.recordset.length > 0) {
            await pool.request()
                .input('usuarioId', mssql_1.default.Int, id)
                .input('rolId', mssql_1.default.Int, roleId)
                .query('UPDATE UsuarioRoles SET RolID = @rolId WHERE UsuarioID = @usuarioId');
        }
        else {
            await pool.request()
                .input('usuarioId', mssql_1.default.Int, id)
                .input('rolId', mssql_1.default.Int, roleId)
                .query('INSERT INTO UsuarioRoles (UsuarioID, RolID, AsignadoEl) VALUES (@usuarioId, @rolId, GETDATE())');
        }
        const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, id)
            .input('eventType', mssql_1.default.VarChar, 'MODIFICACION_ROL')
            .input('detail', mssql_1.default.VarChar, `Administrador (${user.username}) modificó el rol del usuario a ID: ${roleId}`)
            .input('ipAddress', mssql_1.default.VarChar, ipAddress)
            .query(`
        INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
        VALUES (@usuarioId, @eventType, @detail, GETDATE(), @ipAddress)
      `);
        return res.status(200).json({ message: 'Rol de usuario actualizado correctamente' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al actualizar rol de usuario', details: error.message });
    }
}
async function updateUserStatus(req, res) {
    const user = req.user;
    if (user?.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso prohibido: Se requieren privilegios de Administrador' });
    }
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['ACTIVO', 'BLOQUEADO', 'INACTIVO'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido. Debe ser ACTIVO, BLOQUEADO o INACTIVO' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, id)
            .input('estado', mssql_1.default.VarChar, status)
            .query('UPDATE Usuarios SET Estado = @estado WHERE UsuarioID = @usuarioId');
        const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, id)
            .input('eventType', mssql_1.default.VarChar, 'MODIFICACION_ESTADO')
            .input('detail', mssql_1.default.VarChar, `Administrador (${user.username}) modificó el estado a: ${status}`)
            .input('ipAddress', mssql_1.default.VarChar, ipAddress)
            .query(`
        INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
        VALUES (@usuarioId, @eventType, @detail, GETDATE(), @ipAddress)
      `);
        return res.status(200).json({ message: 'Estado del usuario actualizado correctamente' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al actualizar estado del usuario', details: error.message });
    }
}
async function deleteUser(req, res) {
    const user = req.user;
    if (user?.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso prohibido: Se requieren privilegios de Administrador' });
    }
    const { id } = req.params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    if (numericId === user.userId) {
        return res.status(400).json({ error: 'No puedes eliminar a tu propio usuario administrador' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        // Find and delete all sessions for this userId in MongoDB
        const sessions = await models_1.Session.find({ userId: numericId });
        const sessionIds = sessions.map(s => s._id);
        if (sessionIds.length > 0) {
            await models_1.DecisionLog.deleteMany({ sessionId: { $in: sessionIds } });
        }
        await models_1.Session.deleteMany({ userId: numericId });
        await models_1.UnlockedEnding.deleteMany({ userId: numericId });
        // Now delete from SQL Server
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, numericId)
            .query('DELETE FROM Usuarios WHERE UsuarioID = @usuarioId');
        return res.status(200).json({ message: 'Usuario y todos sus registros de juego eliminados de forma permanente' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al eliminar usuario', details: error.message });
    }
}
async function createUser(req, res) {
    const adminUser = req.user;
    if (adminUser?.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso prohibido: Se requieren privilegios de Administrador' });
    }
    const { username, email, password, roleId, status } = req.body;
    if (!username || !email || !password || !roleId) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: username, email, password, roleId' });
    }
    const userStatus = status || 'ACTIVO';
    if (!['ACTIVO', 'BLOQUEADO', 'INACTIVO'].includes(userStatus)) {
        return res.status(400).json({ error: 'Estado inválido. Debe ser ACTIVO, BLOQUEADO o INACTIVO' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        // Check if user already exists
        const existingResult = await pool.request()
            .input('username', mssql_1.default.VarChar, username)
            .input('email', mssql_1.default.VarChar, email)
            .query('SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = @username OR Email = @email');
        if (existingResult.recordset.length > 0) {
            return res.status(400).json({ error: 'El nombre de usuario o el email ya están registrados' });
        }
        // Verify role exists
        const roleResult = await pool.request()
            .input('roleId', mssql_1.default.Int, roleId)
            .query('SELECT RolID, NombreRol FROM Roles WHERE RolID = @roleId');
        if (roleResult.recordset.length === 0) {
            return res.status(400).json({ error: 'El RolID proporcionado no existe en el sistema' });
        }
        const roleName = roleResult.recordset[0].NombreRol;
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Insert user and fetch generated UsuarioID
        const insertUserResult = await pool.request()
            .input('username', mssql_1.default.VarChar, username)
            .input('email', mssql_1.default.VarChar, email)
            .input('passwordHash', mssql_1.default.VarChar, passwordHash)
            .input('status', mssql_1.default.VarChar, userStatus)
            .query(`
        INSERT INTO Usuarios (NombreUsuario, Email, PasswordHash, Estado, FechaRegistro)
        OUTPUT INSERTED.UsuarioID
        VALUES (@username, @email, @passwordHash, @status, GETDATE())
      `);
        const usuarioId = insertUserResult.recordset[0].UsuarioID;
        // Assign role
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, usuarioId)
            .input('rolId', mssql_1.default.Int, roleId)
            .query('INSERT INTO UsuarioRoles (UsuarioID, RolID, AsignadoEl) VALUES (@usuarioId, @rolId, GETDATE())');
        // Create Audit Log
        const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, usuarioId)
            .input('eventType', mssql_1.default.VarChar, 'CREACION_USUARIO')
            .input('detail', mssql_1.default.VarChar, `Administrador (${adminUser.username}) creó al operario con rol ${roleName}`)
            .input('ipAddress', mssql_1.default.VarChar, ipAddress)
            .query(`
        INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
        VALUES (@usuarioId, @eventType, @detail, GETDATE(), @ipAddress)
      `);
        return res.status(201).json({
            message: 'Operario creado exitosamente por el administrador',
            user: {
                UsuarioID: usuarioId,
                NombreUsuario: username,
                Email: email,
                Estado: userStatus,
                RolID: roleId,
                NombreRol: roleName,
                FechaRegistro: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[Admin Controller] Create user error:', error);
        return res.status(500).json({ error: 'Error del servidor al crear operario', details: error.message });
    }
}
