-- =========================================================================
-- PUNTO 1: USUARIOS Y ROLES DEL PROYECTO (LÓGICA DEL JUEGO / APLICACIÓN)
-- =========================================================================

-- 1.1 Inserción de los Roles lógicos en el juego
INSERT INTO Roles (NombreRol, Descripcion) VALUES 
('Administrador', 'Acceso total al panel de control, auditoría de seguridad y gestión de operarios.'),
('Jugador', 'Rol estándar para iniciar partidas, ingresar comandos en la terminal y registrar finales.'),
('IA_Monitor', 'Rol automático asignado al motor de Machine Learning (Gemini) para auditoría del lore.'),
('Moderador', 'Soporte de operaciones, permite desbloquear cuentas y ver logs de auditoría.');

-- 1.2 Generación de usuarios del juego (Creación de n usuarios y asignación de roles)
INSERT INTO Usuarios (NombreUsuario, Email, PasswordHash, Estado) VALUES
('operario_nodo_1', 'nodo1@aethelgard.com', 'password_encrypted_hash_1', 'ACTIVO'),
('operario_nodo_2', 'nodo2@aethelgard.com', 'password_encrypted_hash_2', 'ACTIVO'),
('operario_nodo_3', 'nodo3@aethelgard.com', 'password_encrypted_hash_3', 'BLOQUEADO'),
('operario_nodo_4', 'nodo4@aethelgard.com', 'password_encrypted_hash_4', 'ACTIVO'),
('operario_nodo_5', 'nodo5@aethelgard.com', 'password_encrypted_hash_5', 'ACTIVO'),
('operario_nodo_6', 'nodo6@aethelgard.com', 'password_encrypted_hash_6', 'ACTIVO'),
('operario_nodo_7', 'nodo7@aethelgard.com', 'password_encrypted_hash_7', 'ACTIVO'),
('operario_nodo_8', 'nodo8@aethelgard.com', 'password_encrypted_hash_8', 'ACTIVO'),
('operario_nodo_9', 'nodo9@aethelgard.com', 'password_encrypted_hash_9', 'ACTIVO'),
('operario_nodo_10', 'nodo10@aethelgard.com', 'password_encrypted_hash_10', 'ACTIVO');

-- Asignación de Roles lógicos correspondientes de forma dinámica (Evita el Error 547 y cambia el último RolID por 5)
INSERT INTO UsuarioRoles (UsuarioID, RolID) VALUES 
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_1'), (SELECT RolID FROM Roles WHERE NombreRol = 'Administrador')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_2'), (SELECT RolID FROM Roles WHERE NombreRol = 'IA_Monitor')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_3'), (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_4'), (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_5'), (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_6'), (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_7'), (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_8'), (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_9'), (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador')),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_10'), 5); -- Se fuerza el RolID asignado a 5 como lo solicitaste
GO

-- Poblado de Historial de Logins para consultas
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente, DetalleError) VALUES
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_1'), 'operario_nodo_1', 1, '10.0.0.5', 'Edge', NULL),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_2'), 'operario_nodo_2', 1, '192.168.1.101', 'Firefox', NULL),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_3'), 'operario_nodo_3', 0, '192.168.1.150', 'Console/RetroCli', 'Password incorrecta'),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_3'), 'operario_nodo_3', 0, '192.168.1.150', 'Console/RetroCli', 'Password incorrecta'),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_3'), 'operario_nodo_3', 0, '192.168.1.150', 'Console/RetroCli', 'Password incorrecta'),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_4'), 'operario_nodo_4', 1, '192.168.1.100', 'Chrome', NULL),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_4'), 'operario_nodo_4', 0, '192.168.1.100', 'Chrome', 'Password incorrecta');

-- Poblado de Auditoría de Sesiones para consultas
INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, DireccionIP) VALUES
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_3'), 'BLOQUEO_CUENTA', 'La cuenta ha sido bloqueada automáticamente tras exceder 3 intentos fallidos.', '192.168.1.150'),
((SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_4'), 'CAMBIO_PASSWORD', 'El usuario actualizó su contraseña por sospecha de brecha.', '192.168.1.100');
GO

-- =========================================================================
-- PUNTO 2: CREACIÓN DE 5 VISTAS Y SUS COMANDOS DE EJECUCIÓN
-- =========================================================================

-- Vista 1: v_ResumenUsuarioRoles
DROP VIEW IF EXISTS v_ResumenUsuarioRoles;
GO
CREATE VIEW v_ResumenUsuarioRoles AS
SELECT 
    U.UsuarioID,
    U.NombreUsuario,
    U.Email,
    U.Estado,
    R.NombreRol,
    R.Descripcion AS DescripcionRol,
    UR.AsignadoEl
FROM Usuarios U
INNER JOIN UsuarioRoles UR ON U.UsuarioID = UR.UsuarioID
LEFT JOIN Roles R ON UR.RolID = R.RolID; -- Cambiado a LEFT JOIN por si el RolID 5 no existe en la tabla Roles
GO
-- Comando de ejecución para Vista 1:
SELECT * FROM v_ResumenUsuarioRoles;
GO

-- Vista 2: v_EstadisticasLogins
DROP VIEW IF EXISTS v_EstadisticasLogins;
GO
CREATE VIEW v_EstadisticasLogins AS
SELECT 
    U.UsuarioID,
    U.NombreUsuario,
    COUNT(H.LogID) AS TotalIntentos,
    SUM(CASE WHEN H.Exitoso = 1 THEN 1 ELSE 0 END) AS IntentosExitosos,
    SUM(CASE WHEN H.Exitoso = 0 THEN 1 ELSE 0 END) AS IntentosFallidos,
    MAX(H.FechaIntento) AS UltimoIntentoFecha
FROM Usuarios U
LEFT JOIN HistorialLogins H ON U.UsuarioID = H.UsuarioID
GROUP BY U.UsuarioID, U.NombreUsuario;
GO
-- Comando de ejecución para Vista 2:
SELECT * FROM v_EstadisticasLogins;
GO

-- Vista 3: v_AuditoriaAlerta
DROP VIEW IF EXISTS v_AuditoriaAlerta;
GO
CREATE VIEW v_AuditoriaAlerta AS
SELECT 
    A.AuditoriaID,
    U.NombreUsuario,
    A.TipoEvento,
    A.Detalle,
    A.FechaEvento,
    A.DireccionIP
FROM AuditoriaSesiones A
INNER JOIN Usuarios U ON A.UsuarioID = U.UsuarioID
WHERE A.TipoEvento IN ('BLOQUEO_CUENTA', 'CAMBIO_PASSWORD', 'ACCESO_NO_AUTORIZADO', 'SUPERADO_LIMITE_INTENTOS');
GO
-- Comando de ejecución para Vista 3:
SELECT * FROM v_AuditoriaAlerta;
GO

-- Vista 4: v_IntentosFallidosRecientes
DROP VIEW IF EXISTS v_IntentosFallidosRecientes;
GO
CREATE VIEW v_IntentosFallidosRecientes AS
SELECT 
    LogID,
    UsuarioID,
    NombreUsuarioIngresado,
    FechaIntento,
    DireccionIP,
    DispositivoCliente,
    DetalleError
FROM HistorialLogins
WHERE Exitoso = 0 
  AND FechaIntento >= DATEADD(day, -7, GETDATE());
GO
-- Comando de ejecución para Vista 4:
SELECT * FROM v_IntentosFallidosRecientes;
GO

-- Vista 5: v_UsuariosBloqueados
DROP VIEW IF EXISTS v_UsuariosBloqueados;
GO
CREATE VIEW v_UsuariosBloqueados AS
SELECT 
    U.UsuarioID,
    U.NombreUsuario,
    U.Email,
    U.Estado,
    U.UltimoAcceso,
    (SELECT TOP 1 A.Detalle FROM AuditoriaSesiones A WHERE A.UsuarioID = U.UsuarioID AND A.TipoEvento = 'BLOQUEO_CUENTA' ORDER BY A.FechaEvento DESC) AS MotivoBloqueo,
    (SELECT TOP 1 A.FechaEvento FROM AuditoriaSesiones A WHERE A.UsuarioID = U.UsuarioID AND A.TipoEvento = 'BLOQUEO_CUENTA' ORDER BY A.FechaEvento DESC) AS FechaBloqueo
FROM Usuarios U
WHERE U.Estado = 'BLOQUEADO';
GO
-- Comando de ejecución para Vista 5:
SELECT * FROM v_UsuariosBloqueados;
GO

-- =========================================================================
-- PUNTO 3: PROCEDIMIENTOS ALMACENADOS Y SUS COMANDOS DE EJECUCIÓN
-- =========================================================================

-- Procedimiento 1: sp_RegistrarUsuario
DROP PROCEDURE IF EXISTS sp_RegistrarUsuario;
GO
CREATE PROCEDURE sp_RegistrarUsuario
    @NombreUsuario VARCHAR(50),
    @Email VARCHAR(100),
    @PasswordHash VARCHAR(255),
    @RolID INT
AS
BEGIN
    INSERT INTO Usuarios (NombreUsuario, Email, PasswordHash, Estado)
    VALUES (@NombreUsuario, @Email, @PasswordHash, 'ACTIVO');
    
    DECLARE @NuevoUsuarioID INT = SCOPE_IDENTITY();

    INSERT INTO UsuarioRoles (UsuarioID, RolID)
    VALUES (@NuevoUsuarioID, @RolID);

    INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, DireccionIP)
    VALUES (@NuevoUsuarioID, 'REGISTRO_USUARIO', 'Usuario registrado y rol inicial asignado.', '0.0.0.0');
END;
GO
-- Comando de ejecución para Procedimiento 1 (Ejemplo con rol Jugador):
DECLARE @IdRolJugador INT = (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador');
EXEC sp_RegistrarUsuario @NombreUsuario = 'procedimiento_test_2', @Email = 'test1@aethelgard.com', @PasswordHash = 'hash123', @RolID = @IdRolJugador;
GO

-- Procedimiento 2: sp_RegistrarIntentoLogin
DROP PROCEDURE IF EXISTS sp_RegistrarIntentoLogin;
GO
CREATE PROCEDURE sp_RegistrarIntentoLogin
    @UsuarioID INT,
    @NombreUsuario VARCHAR(50),
    @Exitoso BIT,
    @DireccionIP VARCHAR(45),
    @DispositivoCliente VARCHAR(255),
    @DetalleError VARCHAR(150) = NULL
AS
BEGIN
    INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente, DetalleError)
    VALUES (@UsuarioID, @NombreUsuario, @Exitoso, @DireccionIP, @DispositivoCliente, @DetalleError);

    IF @Exitoso = 1
    BEGIN
        UPDATE Usuarios SET UltimoAcceso = GETDATE() WHERE UsuarioID = @UsuarioID;
    END;
END;
GO
-- Comando de ejecución para Procedimiento 2:
DECLARE @IdUser2 INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_2');
EXEC sp_RegistrarIntentoLogin @UsuarioID = @IdUser2, @NombreUsuario = 'operario_nodo_2', @Exitoso = 1, @DireccionIP = '127.0.0.1', @DispositivoCliente = 'SSMS Client';
GO

-- Procedimiento 3: sp_ActualizarEstadoUsuario
DROP PROCEDURE IF EXISTS sp_ActualizarEstadoUsuario;
GO
CREATE PROCEDURE sp_ActualizarEstadoUsuario
    @UsuarioID INT,
    @NuevoEstado VARCHAR(20),
    @Motivo VARCHAR(255)
AS
BEGIN
    UPDATE Usuarios SET Estado = @NuevoEstado WHERE UsuarioID = @UsuarioID;

    INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, DireccionIP)
    VALUES (@UsuarioID, 'CAMBIO_ESTADO', @Motivo, '127.0.0.1');
END;
GO
-- Comando de ejecución para Procedimiento 3:
DECLARE @IdUser4 INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_4');
EXEC sp_ActualizarEstadoUsuario @UsuarioID = @IdUser4, @NuevoEstado = 'BLOQUEADO', @Motivo = 'Verificación manual rutinaria completa';
GO

-- Procedimiento 4: sp_ObtenerHistorialAuditoria
DROP PROCEDURE IF EXISTS sp_ObtenerHistorialAuditoria;
GO
CREATE PROCEDURE sp_ObtenerHistorialAuditoria
    @UsuarioID INT
AS
BEGIN
    SELECT AuditoriaID, TipoEvento, Detalle, FechaEvento, DireccionIP
    FROM AuditoriaSesiones
    WHERE UsuarioID = @UsuarioID
    ORDER BY FechaEvento DESC;
END;
GO
-- Comando de ejecución para Procedimiento 4:
DECLARE @IdUser3 INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_3');
EXEC sp_ObtenerHistorialAuditoria @UsuarioID = @IdUser3;
GO

-- Procedimiento 5: sp_DepurarHistorialAntiguo
DROP PROCEDURE IF EXISTS sp_DepurarHistorialAntiguo;
GO
CREATE PROCEDURE sp_DepurarHistorialAntiguo
    @DiasRetencion INT
AS
BEGIN
    DECLARE @FechaLimite DATETIME = DATEADD(day, -@DiasRetencion, GETDATE());

    DELETE FROM HistorialLogins WHERE FechaIntento < @FechaLimite;
    DELETE FROM AuditoriaSesiones WHERE FechaEvento < @FechaLimite AND TipoEvento <> 'BLOQUEO_CUENTA';
END;
GO
-- Comando de ejecución para Procedimiento 5 (Retención de 30 días):
EXEC sp_DepurarHistorialAntiguo @DiasRetencion = 30;
GO

-- =========================================================================
-- PUNTO 4: CONSULTAS UTILIZANDO SUBCONSULTAS (SUBQUERIES)
-- =========================================================================

-- Subconsulta 1: Subconsulta Correlacionada en SELECT
SELECT 
    U.UsuarioID,
    U.NombreUsuario,
    U.Email,
    (SELECT MAX(H.FechaIntento) FROM HistorialLogins H WHERE H.UsuarioID = U.UsuarioID AND H.Exitoso = 0) AS UltimoFallo
FROM Usuarios U
WHERE U.Estado = 'ACTIVO';

-- Subconsulta 2: Subconsulta con IN en la cláusula WHERE
SELECT 
    U.UsuarioID,
    U.NombreUsuario,
    U.Email
FROM Usuarios U
WHERE U.UsuarioID NOT IN (
    SELECT DISTINCT H.UsuarioID FROM HistorialLogins H WHERE H.Exitoso = 1 AND H.UsuarioID IS NOT NULL
);

-- Subconsulta 3: Subconsulta como Tabla Derivada en la cláusula FROM
SELECT 
    AVG(Resumen.CantidadEventos) AS PromedioEventos
FROM (
    SELECT U.UsuarioID, COUNT(A.AuditoriaID) AS CantidadEventos
    FROM Usuarios U
    LEFT JOIN AuditoriaSesiones A ON U.UsuarioID = A.UsuarioID
    WHERE U.Estado = 'ACTIVO'
    GROUP BY U.UsuarioID
) AS Resumen;

-- Subconsulta 4: Subconsulta con EXISTS
SELECT 
    R.RolID,
    R.NombreRol
FROM Roles R
WHERE EXISTS (
    SELECT 1 
    FROM UsuarioRoles UR
    INNER JOIN Usuarios U ON UR.UsuarioID = U.UsuarioID
    WHERE UR.RolID = R.RolID AND U.Estado = 'BLOQUEADO'
);

-- Subconsulta 5: Subconsulta comparativa con agregaciones
SELECT 
    U.UsuarioID,
    U.NombreUsuario,
    COUNT(H.LogID) AS SusFallos
FROM Usuarios U
INNER JOIN HistorialLogins H ON U.UsuarioID = H.UsuarioID
WHERE H.Exitoso = 0
GROUP BY U.UsuarioID, U.NombreUsuario
HAVING COUNT(H.LogID) > (
    SELECT AVG(Fallos.Total)
    FROM (
        SELECT U2.UsuarioID, COUNT(H2.LogID) AS Total
        FROM Usuarios U2
        LEFT JOIN HistorialLogins H2 ON U2.UsuarioID = H2.UsuarioID AND H2.Exitoso = 0
        GROUP BY U2.UsuarioID
    ) AS Fallos
);
GO

-- =========================================================================
-- BLOQUE DE PRUEBA DE REGISTRO COMPLEMENTARIO (EVITA CONFLICTOS)
-- =========================================================================
DECLARE @IdRolJugadorFinal INT = (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador');

EXEC sp_RegistrarUsuario 
    @NombreUsuario = 'neo_hacker', 
    @Email = 'neo@aethelgard.com', 
    @PasswordHash = 'passhash_neo_99',
    @RolID = @IdRolJugadorFinal;

DECLARE @IdNeo INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'neo_hacker');

EXEC sp_RegistrarIntentoLogin @UsuarioID = @IdNeo, @NombreUsuario = 'neo_hacker', @Exitoso = 0, @DireccionIP = '192.168.10.45', @DispositivoCliente = 'Terminal Retro CLI', @DetalleError = 'Password inválido';
EXEC sp_RegistrarIntentoLogin @UsuarioID = @IdNeo, @NombreUsuario = 'neo_hacker', @Exitoso = 1, @DireccionIP = '192.168.10.45', @DispositivoCliente = 'Terminal Retro CLI';
GO
USE NeoBandersnatchSecurity;
GO

-- =========================================================================
-- 1. EJECUCIÓN DEL PROCEDIMIENTO: sp_RegistrarUsuario
-- =========================================================================
-- Registra un nuevo usuario en la base de datos y le asocia el rol 'Jugador'
DECLARE @IdRolJugador INT = (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador');

EXEC sp_RegistrarUsuario 
    @NombreUsuario = 'trinity_coder', 
    @Email = 'trinity@aethelgard.com', 
    @PasswordHash = 'hash_secure_trinity_77', 
    @RolID = @IdRolJugador;

-- Query para ver el resultado de la inserción:
SELECT * FROM Usuarios WHERE NombreUsuario = 'trinity_coder';
SELECT * FROM UsuarioRoles WHERE UsuarioID = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'trinity_coder');
GO


-- =========================================================================
-- 2. EJECUCIÓN DEL PROCEDIMIENTO: sp_RegistrarIntentoLogin
-- =========================================================================
-- Registra un intento de sesión (exitoso) para el usuario 'operario_nodo_5'
DECLARE @User5ID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_5');

EXEC sp_RegistrarIntentoLogin 
    @UsuarioID = @User5ID, 
    @NombreUsuario = 'operario_nodo_5', 
    @Exitoso = 1, 
    @DireccionIP = '10.0.0.15', 
    @DispositivoCliente = 'Workstation Node 5';

-- Query para ver el resultado en el historial de accesos y la última fecha de login:
SELECT TOP 1 * FROM HistorialLogins WHERE UsuarioID = @User5ID ORDER BY FechaIntento DESC;
SELECT UsuarioID, NombreUsuario, UltimoAcceso FROM Usuarios WHERE UsuarioID = @User5ID;
GO


-- =========================================================================
-- 3. EJECUCIÓN DEL PROCEDIMIENTO: sp_ActualizarEstadoUsuario
-- =========================================================================
-- Cambia el estado de 'operario_nodo_4' a 'SUSPENDIDO' y añade la auditoría correspondiente
DECLARE @User4ID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_4');

EXEC sp_ActualizarEstadoUsuario 
    @UsuarioID = @User4ID, 
    @NuevoEstado = 'SUSPENDIDO', 
    @Motivo = 'Mantenimiento preventivo del nodo de red terminal.';

-- Query para ver el estado modificado y el registro en la auditoría de sesiones:
SELECT UsuarioID, NombreUsuario, Estado FROM Usuarios WHERE UsuarioID = @User4ID;
SELECT TOP 1 * FROM AuditoriaSesiones WHERE UsuarioID = @User4ID ORDER BY FechaEvento DESC;
GO


-- =========================================================================
-- 4. EJECUCIÓN DEL PROCEDIMIENTO: sp_ObtenerHistorialAuditoria
-- =========================================================================
-- Retorna en una tabla de resultados todo el historial de auditoría de 'operario_nodo_3'
DECLARE @User3ID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_nodo_3');

EXEC sp_ObtenerHistorialAuditoria @UsuarioID = @User3ID;
GO


-- =========================================================================
-- 5. EJECUCIÓN DEL PROCEDIMIENTO: sp_DepurarHistorialAntiguo
-- =========================================================================
-- Limpia del servidor el historial y registros de auditoría que tengan más de 90 días
EXEC sp_DepurarHistorialAntiguo @DiasRetencion = 90;

-- Query para verificar que las bitácoras ya no contengan información previa a la fecha límite:
SELECT COUNT(*) AS LoginsRestantes FROM HistorialLogins WHERE FechaIntento < DATEADD(day, -90, GETDATE());
SELECT COUNT(*) AS EventosRestantes FROM AuditoriaSesiones WHERE FechaEvento < DATEADD(day, -90, GETDATE()) AND TipoEvento <> 'BLOQUEO_CUENTA';
GO