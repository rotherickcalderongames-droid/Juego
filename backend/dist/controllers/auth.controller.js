"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getAuditHistory = getAuditHistory;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mssql_1 = __importDefault(require("mssql"));
const mssql_service_1 = require("../services/mssql.service");
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_cyberpunk_token_key_2099';
async function register(req, res) {
    const { username, email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    try {
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        const pool = (0, mssql_service_1.getPool)();
        // Check if user already exists in SQL Server
        const existingResult = await pool.request()
            .input('username', mssql_1.default.VarChar, username)
            .input('email', mssql_1.default.VarChar, email)
            .query('SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = @username OR Email = @email');
        if (existingResult.recordset.length > 0) {
            return res.status(400).json({ error: 'El nombre de usuario o el email ya están registrados' });
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Insert user and fetch generated UsuarioID
        const insertUserResult = await pool.request()
            .input('username', mssql_1.default.VarChar, username)
            .input('email', mssql_1.default.VarChar, email)
            .input('passwordHash', mssql_1.default.VarChar, passwordHash)
            .query(`
        INSERT INTO Usuarios (NombreUsuario, Email, PasswordHash, Estado, FechaRegistro)
        OUTPUT INSERTED.UsuarioID
        VALUES (@username, @email, @passwordHash, 'ACTIVO', GETDATE())
      `);
        const usuarioId = insertUserResult.recordset[0].UsuarioID;
        // Get role ID for 'Jugador'
        let roleResult = await pool.request()
            .input('roleName', mssql_1.default.VarChar, 'Jugador')
            .query('SELECT RolID FROM Roles WHERE NombreRol = @roleName');
        let rolId = roleResult.recordset[0]?.RolID;
        if (!rolId) {
            // Emergency role insertion if seed failed
            const insertRoleResult = await pool.request()
                .input('roleName', mssql_1.default.VarChar, 'Jugador')
                .input('desc', mssql_1.default.VarChar, 'Rol predeterminado de jugador')
                .query('INSERT INTO Roles (NombreRol, Descripcion) OUTPUT INSERTED.RolID VALUES (@roleName, @desc)');
            rolId = insertRoleResult.recordset[0].RolID;
        }
        // Assign role to user
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, usuarioId)
            .input('rolId', mssql_1.default.Int, rolId)
            .query('INSERT INTO UsuarioRoles (UsuarioID, RolID, AsignadoEl) VALUES (@usuarioId, @rolId, GETDATE())');
        // Create Audit Log
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, usuarioId)
            .input('eventType', mssql_1.default.VarChar, 'REGISTRO')
            .input('detail', mssql_1.default.VarChar, 'Usuario registrado correctamente con rol Jugador.')
            .input('ipAddress', mssql_1.default.VarChar, ipAddress)
            .query(`
        INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
        VALUES (@usuarioId, @eventType, @detail, GETDATE(), @ipAddress)
      `);
        // Generate JWT Token (payload contains numeric userId)
        const token = jsonwebtoken_1.default.sign({ userId: usuarioId, username, role: 'Jugador' }, JWT_SECRET, { expiresIn: '24h' });
        return res.status(201).json({
            message: 'Usuario registrado correctamente',
            token,
            user: { id: usuarioId, username, email }
        });
    }
    catch (error) {
        console.error('[Auth Controller] Register error:', error);
        return res.status(500).json({ error: 'Error del servidor al registrar usuario', details: error.message });
    }
}
async function login(req, res) {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconocido';
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        const pool = (0, mssql_service_1.getPool)();
        // Find user by Username
        const userResult = await pool.request()
            .input('username', mssql_1.default.VarChar, username)
            .query('SELECT UsuarioID, NombreUsuario, Email, PasswordHash, Estado FROM Usuarios WHERE NombreUsuario = @username');
        const user = userResult.recordset[0];
        if (!user) {
            // Register failed login in log (no user id)
            await pool.request()
                .input('usernameEntered', mssql_1.default.VarChar, username)
                .input('ipAddress', mssql_1.default.VarChar, ipAddress)
                .input('userAgent', mssql_1.default.VarChar, userAgent)
                .query(`
          INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, FechaIntento, Exitoso, DireccionIP, DispositivoCliente, DetalleError)
          VALUES (NULL, @usernameEntered, GETDATE(), 0, @ipAddress, @userAgent, 'Usuario no encontrado')
        `);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        // Check account status
        if (user.Estado === 'BLOQUEADO' || user.Estado === 'INACTIVO') {
            await pool.request()
                .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
                .input('usernameEntered', mssql_1.default.VarChar, username)
                .input('ipAddress', mssql_1.default.VarChar, ipAddress)
                .input('userAgent', mssql_1.default.VarChar, userAgent)
                .input('err', mssql_1.default.VarChar, `Cuenta con estado: ${user.Estado}`)
                .query(`
          INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, FechaIntento, Exitoso, DireccionIP, DispositivoCliente, DetalleError)
          VALUES (@usuarioId, @usernameEntered, GETDATE(), 0, @ipAddress, @userAgent, @err)
        `);
            return res.status(403).json({ error: `La cuenta está bloqueada o inactiva.` });
        }
        // Validate password
        const isMatch = await bcryptjs_1.default.compare(password, user.PasswordHash);
        if (!isMatch) {
            // Register failed login in log
            await pool.request()
                .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
                .input('usernameEntered', mssql_1.default.VarChar, username)
                .input('ipAddress', mssql_1.default.VarChar, ipAddress)
                .input('userAgent', mssql_1.default.VarChar, userAgent)
                .query(`
          INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, FechaIntento, Exitoso, DireccionIP, DispositivoCliente, DetalleError)
          VALUES (@usuarioId, @usernameEntered, GETDATE(), 0, @ipAddress, @userAgent, 'Contraseña incorrecta')
        `);
            // Account lockout mechanism (lockout after 5 failures in the last 15 minutes)
            const recentResult = await pool.request()
                .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
                .query(`
          SELECT COUNT(*) AS Failures FROM HistorialLogins
          WHERE UsuarioID = @usuarioId AND Exitoso = 0 AND FechaIntento > DATEADD(minute, -15, GETDATE())
        `);
            const failures = recentResult.recordset[0].Failures;
            if (failures >= 5) {
                // Lock user account
                await pool.request()
                    .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
                    .query("UPDATE Usuarios SET Estado = 'BLOQUEADO' WHERE UsuarioID = @usuarioId");
                // Critical lock audit
                await pool.request()
                    .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
                    .input('ipAddress', mssql_1.default.VarChar, ipAddress)
                    .query(`
            INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
            VALUES (@usuarioId, 'BLOQUEO_CUENTA', 'Cuenta bloqueada automáticamente tras 5 intentos fallidos de inicio de sesión.', GETDATE(), @ipAddress)
          `);
            }
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        // Update last access date
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
            .query('UPDATE Usuarios SET UltimoAcceso = GETDATE() WHERE UsuarioID = @usuarioId');
        // Register success login log
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
            .input('usernameEntered', mssql_1.default.VarChar, username)
            .input('ipAddress', mssql_1.default.VarChar, ipAddress)
            .input('userAgent', mssql_1.default.VarChar, userAgent)
            .query(`
        INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, FechaIntento, Exitoso, DireccionIP, DispositivoCliente)
        VALUES (@usuarioId, @usernameEntered, GETDATE(), 1, @ipAddress, @userAgent)
      `);
        // Session audit log
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
            .input('ipAddress', mssql_1.default.VarChar, ipAddress)
            .query(`
        INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
        VALUES (@usuarioId, 'LOGIN_EXITOSO', 'Inicio de sesión exitoso.', GETDATE(), @ipAddress)
      `);
        // Find user role
        const rolesResult = await pool.request()
            .input('usuarioId', mssql_1.default.Int, user.UsuarioID)
            .query(`
        SELECT r.NombreRol FROM UsuarioRoles ur
        INNER JOIN Roles r ON ur.RolID = r.RolID
        WHERE ur.UsuarioID = @usuarioId
      `);
        const roleName = rolesResult.recordset[0]?.NombreRol || 'Jugador';
        // Generate token
        const token = jsonwebtoken_1.default.sign({ userId: user.UsuarioID, username: user.NombreUsuario, role: roleName }, JWT_SECRET, { expiresIn: '24h' });
        return res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token,
            user: { id: user.UsuarioID, username: user.NombreUsuario, role: roleName }
        });
    }
    catch (error) {
        console.error('[Auth Controller] Login error:', error);
        return res.status(500).json({ error: 'Error del servidor al iniciar sesión', details: error.message });
    }
}
async function getAuditHistory(req, res) {
    try {
        const pool = (0, mssql_service_1.getPool)();
        const result = await pool.request().query(`
      SELECT TOP 50 A.AuditoriaID, A.TipoEvento, A.Detalle, A.FechaEvento, A.DireccionIP,
             U.UsuarioID, U.NombreUsuario, U.Email
      FROM AuditoriaSesiones A
      INNER JOIN Usuarios U ON A.UsuarioID = U.UsuarioID
      ORDER BY A.FechaEvento DESC
    `);
        // Map rows to match the expected original schema structures (userId nested populating)
        const audits = result.recordset.map(row => ({
            _id: row.AuditoriaID,
            eventType: row.TipoEvento,
            detail: row.Detalle,
            eventDate: row.FechaEvento,
            ipAddress: row.DireccionIP,
            userId: {
                _id: row.UsuarioID,
                username: row.NombreUsuario,
                email: row.Email
            }
        }));
        return res.json(audits);
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al recuperar auditorías', details: error.message });
    }
}
