-- =========================================================================
-- ESQUEMA DE AUDITORÍA Y TRIGGERS PARA NEO-BANDERSNATCH (SQL Server)
-- Materia: Tecnología de Base de Datos I (UPDS)
-- =========================================================================

USE NeoBandersnatchSecurity;
GO

-- =========================================================================
-- TABLA DE AUDITORÍA CENTRALIZADA (PERSISTENCIA TIPO DOCUMENTO / JSON)
-- =========================================================================
IF OBJECT_ID('dbo.AuditoriaDatos', 'U') IS NULL
BEGIN
    CREATE TABLE AuditoriaDatos (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        TablaAfectada VARCHAR(128) NOT NULL,
        Accion VARCHAR(20) NOT NULL,                  -- 'INSERT', 'UPDATE', 'DELETE'
        UsuarioBD VARCHAR(100) DEFAULT SYSTEM_USER,
        FechaRegistro DATETIME DEFAULT GETDATE(),
        DatosAnteriores NVARCHAR(MAX) NULL,           -- Guardado como JSON Array
        DatosNuevos NVARCHAR(MAX) NULL                -- Guardado como JSON Array
    );
END;
GO


-- =========================================================================
-- CATEGORÍA 1: TRIGGERS DE AUDITORÍA EN TIEMPO REAL (CONVERSIÓN A JSON)
-- =========================================================================

-- 1. Trigger de inserción de Usuarios
CREATE OR ALTER TRIGGER tr_Audit_Usuarios_Insert
ON Usuarios
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AuditoriaDatos (TablaAfectada, Accion, DatosAnteriores, DatosNuevos)
    VALUES ('Usuarios', 'INSERT', NULL, (SELECT * FROM inserted FOR JSON PATH));
END;
GO

-- 2. Trigger de modificación de Usuarios
CREATE OR ALTER TRIGGER tr_Audit_Usuarios_Update
ON Usuarios
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO AuditoriaDatos (TablaAfectada, Accion, DatosAnteriores, DatosNuevos)
        VALUES ('Usuarios', 'UPDATE', 
                (SELECT * FROM deleted FOR JSON PATH), 
                (SELECT * FROM inserted FOR JSON PATH));
    END;
END;
GO

-- 3. Trigger de eliminación de Usuarios
CREATE OR ALTER TRIGGER tr_Audit_Usuarios_Delete
ON Usuarios
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AuditoriaDatos (TablaAfectada, Accion, DatosAnteriores, DatosNuevos)
    VALUES ('Usuarios', 'DELETE', (SELECT * FROM deleted FOR JSON PATH), NULL);
END;
GO

-- 4. Trigger de inserción de Roles
CREATE OR ALTER TRIGGER tr_Audit_Roles_Insert
ON Roles
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AuditoriaDatos (TablaAfectada, Accion, DatosAnteriores, DatosNuevos)
    VALUES ('Roles', 'INSERT', NULL, (SELECT * FROM inserted FOR JSON PATH));
END;
GO

-- 5. Trigger de modificación de Roles
CREATE OR ALTER TRIGGER tr_Audit_Roles_Update
ON Roles
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO AuditoriaDatos (TablaAfectada, Accion, DatosAnteriores, DatosNuevos)
        VALUES ('Roles', 'UPDATE', 
                (SELECT * FROM deleted FOR JSON PATH), 
                (SELECT * FROM inserted FOR JSON PATH));
    END;
END;
GO

-- 6. Trigger de eliminación de Roles
CREATE OR ALTER TRIGGER tr_Audit_Roles_Delete
ON Roles
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AuditoriaDatos (TablaAfectada, Accion, DatosAnteriores, DatosNuevos)
    VALUES ('Roles', 'DELETE', (SELECT * FROM deleted FOR JSON PATH), NULL);
END;
GO

-- 7. Trigger de inserción de UsuarioRoles
CREATE OR ALTER TRIGGER tr_Audit_UsuarioRoles_Insert
ON UsuarioRoles
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AuditoriaDatos (TablaAfectada, Accion, DatosAnteriores, DatosNuevos)
    VALUES ('UsuarioRoles', 'INSERT', NULL, (SELECT * FROM inserted FOR JSON PATH));
END;
GO

-- 8. Trigger de eliminación de UsuarioRoles
CREATE OR ALTER TRIGGER tr_Audit_UsuarioRoles_Delete
ON UsuarioRoles
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AuditoriaDatos (TablaAfectada, Accion, DatosAnteriores, DatosNuevos)
    VALUES ('UsuarioRoles', 'DELETE', (SELECT * FROM deleted FOR JSON PATH), NULL);
END;
GO


-- =========================================================================
-- CATEGORÍA 2: TRIGGERS DE REGLAS DE NEGOCIO E INTEGRIDAD (SEGURIDAD CRÍTICA)
-- =========================================================================

-- 9. Impedir la eliminación física del Rol 'Administrador'
CREATE OR ALTER TRIGGER tr_Seguridad_EvitarEliminarAdmin
ON Roles
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM deleted WHERE NombreRol = 'Administrador')
    BEGIN
        RAISERROR ('[SEGURIDAD] Operación Cancelada: No está permitido eliminar el rol Administrador.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;
END;
GO

-- 10. Validar longitud mínima de seguridad para las contraseñas
CREATE OR ALTER TRIGGER tr_Seguridad_ContrasenaFormato
ON Usuarios
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted WHERE LEN(PasswordHash) < 8)
    BEGIN
        RAISERROR ('[SEGURIDAD] Operación Cancelada: La contraseña o su hash debe tener al menos 8 caracteres.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;
END;
GO

-- 11. Evitar dejar al sistema sin ningún usuario con Rol Administrador
CREATE OR ALTER TRIGGER tr_Seguridad_EvitarEliminarUltimoAdmin
ON UsuarioRoles
AFTER DELETE, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AdminRolID INT;
    SELECT @AdminRolID = RolID FROM Roles WHERE NombreRol = 'Administrador';

    -- Si se eliminan o actualizan registros vinculados al rol Administrador
    IF EXISTS (SELECT 1 FROM deleted WHERE RolID = @AdminRolID)
    BEGIN
        DECLARE @AdminsRestantes INT;
        SELECT @AdminsRestantes = COUNT(*) FROM UsuarioRoles WHERE RolID = @AdminRolID;

        IF @AdminsRestantes = 0
        BEGIN
            RAISERROR ('[SEGURIDAD] Operación Cancelada: Debe existir al menos un usuario activo con el rol Administrador.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;
    END;
END;
GO

-- 12. Evitar la modificación manual del UsuarioID (Mantenimiento de relaciones de integridad)
CREATE OR ALTER TRIGGER tr_Seguridad_EvitarUpdateUsuarioID
ON Usuarios
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(UsuarioID)
    BEGIN
        RAISERROR ('[INTEGRIDAD] Operación Cancelada: No está permitido modificar el identificador de usuario (UsuarioID).', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;
END;
GO


-- =========================================================================
-- CATEGORÍA 3: TRIGGERS DE AUTOMATIZACIÓN Y FLUJO DE LOGINS
-- =========================================================================

-- 13. Bloqueo automático de cuenta tras 3 intentos fallidos consecutivos
CREATE OR ALTER TRIGGER tr_Login_BloqueoAutomatico
ON HistorialLogins
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UsuarioID INT;
    
    -- Manejamos inserciones con un cursor en caso de lotes múltiples
    DECLARE cur_login_fallas CURSOR LOCAL FAST_FORWARD FOR
        SELECT DISTINCT UsuarioID 
        FROM inserted 
        WHERE Exitoso = 0 AND UsuarioID IS NOT NULL;
        
    OPEN cur_login_fallas;
    FETCH NEXT FROM cur_login_fallas INTO @UsuarioID;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @IntentosFallidosConsecutivos INT = 0;
        
        -- Evaluamos los últimos 3 intentos cronológicamente en HistorialLogins
        SELECT @IntentosFallidosConsecutivos = COUNT(*)
        FROM (
            SELECT TOP 3 Exitoso
            FROM HistorialLogins
            WHERE UsuarioID = @UsuarioID
            ORDER BY FechaIntento DESC
        ) AS UltimosIntentos
        WHERE Exitoso = 0;
        
        -- Si los 3 últimos intentos son fallidos y la cuenta está activa, la bloqueamos
        IF @IntentosFallidosConsecutivos >= 3
        BEGIN
            UPDATE Usuarios 
            SET Estado = 'BLOQUEADO' 
            WHERE UsuarioID = @UsuarioID AND Estado = 'ACTIVO';
            
            -- Registramos la auditoría de seguridad si el estado cambió exitosamente
            IF @@ROWCOUNT > 0
            BEGIN
                DECLARE @IPRegistro VARCHAR(45);
                SELECT TOP 1 @IPRegistro = DireccionIP FROM inserted WHERE UsuarioID = @UsuarioID ORDER BY FechaIntento DESC;

                INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
                VALUES (
                    @UsuarioID, 
                    'BLOQUEO_CUENTA', 
                    'La cuenta ha sido bloqueada automáticamente tras exceder 3 intentos de inicio de sesión fallidos consecutivos.', 
                    GETDATE(), 
                    ISNULL(@IPRegistro, '0.0.0.0')
                );
            END;
        END;
        
        FETCH NEXT FROM cur_login_fallas INTO @UsuarioID;
    END;
    
    CLOSE cur_login_fallas;
    DEALLOCATE cur_login_fallas;
END;
GO

-- 14. Actualización del campo UltimoAcceso en la tabla Usuarios tras login exitoso
CREATE OR ALTER TRIGGER tr_Login_ActualizarUltimoAcceso
ON HistorialLogins
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE U
    SET U.UltimoAcceso = I.FechaIntento
    FROM Usuarios U
    INNER JOIN inserted I ON U.UsuarioID = I.UsuarioID
    WHERE I.Exitoso = 1;
END;
GO

-- 15. Alerta de acceso sospechoso por cambio geográfico/IP repentino
CREATE OR ALTER TRIGGER tr_Login_AlertaIntentoSospechoso
ON HistorialLogins
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UsuarioID INT;
    DECLARE @NuevaIP VARCHAR(45);
    DECLARE @LogID INT;
    
    DECLARE cur_logins CURSOR LOCAL FAST_FORWARD FOR
        SELECT LogID, UsuarioID, DireccionIP
        FROM inserted
        WHERE Exitoso = 1 AND UsuarioID IS NOT NULL;
        
    OPEN cur_logins;
    FETCH NEXT FROM cur_logins INTO @LogID, @UsuarioID, @NuevaIP;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @UltimaIPExito VARCHAR(45) = NULL;
        
        -- Buscamos el inicio de sesión anterior exitoso
        SELECT TOP 1 @UltimaIPExito = DireccionIP
        FROM HistorialLogins
        WHERE UsuarioID = @UsuarioID 
          AND Exitoso = 1 
          AND LogID < @LogID
        ORDER BY FechaIntento DESC;
        
        -- Si hay registro previo con diferente IP, disparamos una advertencia silenciosa en auditoría
        IF @UltimaIPExito IS NOT NULL AND @UltimaIPExito <> @NuevaIP
        BEGIN
            INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
            VALUES (
                @UsuarioID, 
                'ACCESO_SOSPECHOSO', 
                CONCAT('Cambio de dirección IP detectado. IP anterior: ', @UltimaIPExito, ', IP nueva: ', @NuevaIP), 
                GETDATE(), 
                @NuevaIP
            );
        END;
        
        FETCH NEXT FROM cur_logins INTO @LogID, @UsuarioID, @NuevaIP;
    END;
    
    CLOSE cur_logins;
    DEALLOCATE cur_logins;
END;
GO


-- =========================================================================
-- PRUEBAS E INSTRUMENTACIÓN DE VERIFICACIÓN (SCRIPT DE COMPROBACIÓN)
-- =========================================================================

PRINT '---------------------------------------------------------';
PRINT 'Iniciando pruebas de validación de triggers...';
PRINT '---------------------------------------------------------';

-- 1. PRUEBA DE INSERCIÓN Y AUDITORÍA EN JSON (Triggers 1 y 7)
INSERT INTO Usuarios (NombreUsuario, Email, PasswordHash, Estado)
VALUES ('operario_test_trigger', 'test_trigger@aethelgard.com', 'hash_secure_9999', 'ACTIVO');

DECLARE @TestUserID INT = SCOPE_IDENTITY();

-- Asignar rol estándar
INSERT INTO UsuarioRoles (UsuarioID, RolID)
VALUES (@TestUserID, (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador'));

-- Comprobación de inserción en AuditoriaDatos
SELECT 'Inserción de Usuario' AS Prueba, LogID, TablaAfectada, Accion, DatosNuevos 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'Usuarios' AND Accion = 'INSERT';

-- 2. PRUEBA DE MODIFICACIÓN Y AUDITORÍA EN JSON (Trigger 2)
UPDATE Usuarios 
SET Email = 'test_trigger_modificado@aethelgard.com'
WHERE UsuarioID = @TestUserID;

-- Comprobación de modificación en AuditoriaDatos
SELECT 'Modificación de Usuario' AS Prueba, LogID, TablaAfectada, Accion, DatosAnteriores, DatosNuevos 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'Usuarios' AND Accion = 'UPDATE';

-- 3. PRUEBA DE SEGURIDAD: Longitud de Contraseña (Trigger 10)
BEGIN TRY
    INSERT INTO Usuarios (NombreUsuario, Email, PasswordHash, Estado)
    VALUES ('operario_inseguro', 'inseguro@aethelgard.com', '123', 'ACTIVO');
END TRY
BEGIN CATCH
    SELECT 'Restricción de Contraseña Corta' AS Prueba, ERROR_MESSAGE() AS MensajeError;
END CATCH;

-- 4. PRUEBA DE SEGURIDAD: Evitar Borrar Rol Administrador (Trigger 9)
BEGIN TRY
    DELETE FROM Roles WHERE NombreRol = 'Administrador';
END TRY
BEGIN CATCH
    SELECT 'Protección de Rol Administrador' AS Prueba, ERROR_MESSAGE() AS MensajeError;
END CATCH;

-- 5. PRUEBA DE SEGURIDAD: Evitar dejar al sistema sin Administrador (Trigger 11)
BEGIN TRY
    -- Intentamos remover la asignación de rol del Administrador principal
    DELETE FROM UsuarioRoles 
    WHERE RolID = (SELECT RolID FROM Roles WHERE NombreRol = 'Administrador');
END TRY
BEGIN CATCH
    SELECT 'Protección de último Administrador' AS Prueba, ERROR_MESSAGE() AS MensajeError;
END CATCH;

-- 6. PRUEBA DE AUTOMATIZACIÓN: Login Exitoso y Actualización de Fecha (Trigger 14)
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente)
VALUES (@TestUserID, 'operario_test_trigger', 1, '192.168.22.10', 'Terminal Test CLI');

SELECT 'Actualización UltimoAcceso' AS Prueba, UsuarioID, NombreUsuario, UltimoAcceso 
FROM Usuarios 
WHERE UsuarioID = @TestUserID;

-- 7. PRUEBA DE AUTOMATIZACIÓN: Cambio de IP y Alerta Sospechosa (Trigger 15)
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente)
VALUES (@TestUserID, 'operario_test_trigger', 1, '200.48.55.99', 'Terminal Test CLI');

SELECT 'Alerta Acceso Sospechoso' AS Prueba, UsuarioID, TipoEvento, Detalle, DireccionIP 
FROM AuditoriaSesiones 
WHERE UsuarioID = @TestUserID AND TipoEvento = 'ACCESO_SOSPECHOSO';

-- 8. PRUEBA DE AUTOMATIZACIÓN: Bloqueo de cuenta tras 3 intentos fallidos (Trigger 13)
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente, DetalleError) VALUES
(@TestUserID, 'operario_test_trigger', 0, '192.168.22.10', 'Terminal Test CLI', 'Password incorrecta'),
(@TestUserID, 'operario_test_trigger', 0, '192.168.22.10', 'Terminal Test CLI', 'Password incorrecta'),
(@TestUserID, 'operario_test_trigger', 0, '192.168.22.10', 'Terminal Test CLI', 'Password incorrecta');

-- Verificar que el usuario fue bloqueado automáticamente y que se generó la auditoría
SELECT 'Usuario Bloqueado Automáticamente' AS Prueba, UsuarioID, NombreUsuario, Estado 
FROM Usuarios 
WHERE UsuarioID = @TestUserID;

SELECT 'Auditoría de Bloqueo Automático' AS Prueba, UsuarioID, TipoEvento, Detalle 
FROM AuditoriaSesiones 
WHERE UsuarioID = @TestUserID AND TipoEvento = 'BLOQUEO_CUENTA';

-- 9. LIMPIEZA DE PRUEBAS
DELETE FROM UsuarioRoles WHERE UsuarioID = @TestUserID;
DELETE FROM HistorialLogins WHERE UsuarioID = @TestUserID;
DELETE FROM AuditoriaSesiones WHERE UsuarioID = @TestUserID;
DELETE FROM Usuarios WHERE UsuarioID = @TestUserID;
DELETE FROM AuditoriaDatos WHERE TablaAfectada IN ('Usuarios', 'UsuarioRoles');

PRINT '---------------------------------------------------------';
PRINT 'Pruebas completadas y datos de prueba removidos.';
PRINT '---------------------------------------------------------';
GO
