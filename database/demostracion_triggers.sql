-- =========================================================================
-- DEMOSTRACIÓN DE TRIGGERS Y CASOS DE PRUEBA INDIVIDUALES (SQL Server)
-- Este script permite validar paso a paso el comportamiento de cada uno 
-- de los 15 triggers implementados en la base de datos NeoBandersnatchSecurity.
-- =========================================================================

USE NeoBandersnatchSecurity;
GO

-- Limpieza preventiva de demostraciones previas
DELETE FROM UsuarioRoles WHERE UsuarioID IN (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario IN ('operario_demo_test', 'operario_secur_test'));
DELETE FROM HistorialLogins WHERE NombreUsuarioIngresado IN ('operario_demo_test', 'operario_secur_test');
DELETE FROM AuditoriaSesiones WHERE UsuarioID IN (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario IN ('operario_demo_test', 'operario_secur_test'));
DELETE FROM Usuarios WHERE NombreUsuario IN ('operario_demo_test', 'operario_secur_test');
DELETE FROM Roles WHERE NombreRol = 'Rol_Temporal_Demo';
DELETE FROM AuditoriaDatos WHERE TablaAfectada IN ('Usuarios', 'Roles', 'UsuarioRoles');
GO

PRINT '=========================================================================';
PRINT 'INICIO DE LA DEMOSTRACIÓN INDIVIDUAL DE TRIGGERS';
PRINT '=========================================================================';
GO


-- =========================================================================
-- DEMOSTRACIÓN 1: tr_Audit_Usuarios_Insert
-- Descripción: Audita la creación de nuevos usuarios convirtiendo los datos
--              a formato JSON array e insertándolos en AuditoriaDatos.
-- =========================================================================
PRINT '--> Demo 1: Inserción de Usuario';

INSERT INTO Usuarios (NombreUsuario, Email, PasswordHash, Estado)
VALUES ('operario_demo_test', 'demo_test@aethelgard.com', 'hash_secure_demo_pass_123', 'ACTIVO');

-- Consultar la auditoría generada en AuditoriaDatos
SELECT 'Demo 1 - Inserción Usuario' AS Test, LogID, TablaAfectada, Accion, DatosNuevos 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'Usuarios' AND Accion = 'INSERT';
GO


-- =========================================================================
-- DEMOSTRACIÓN 2: tr_Audit_UsuarioRoles_Insert
-- Descripción: Audita la asignación de un rol a un usuario guardando la
--              asociación en formato JSON array en AuditoriaDatos.
-- =========================================================================
PRINT '--> Demo 2: Inserción de Rol a Usuario';

DECLARE @DemoUserID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_demo_test');
DECLARE @RolJugadorID INT = (SELECT RolID FROM Roles WHERE NombreRol = 'Jugador');

INSERT INTO UsuarioRoles (UsuarioID, RolID)
VALUES (@DemoUserID, @RolJugadorID);

-- Consultar la auditoría generada en AuditoriaDatos
SELECT 'Demo 2 - Rol Asignado' AS Test, LogID, TablaAfectada, Accion, DatosNuevos 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'UsuarioRoles' AND Accion = 'INSERT';
GO


-- =========================================================================
-- DEMOSTRACIÓN 3: tr_Audit_Usuarios_Update
-- Descripción: Audita la actualización de datos de un usuario. Guarda
--              los valores anteriores y los nuevos valores en JSON.
-- =========================================================================
PRINT '--> Demo 3: Modificación de datos de Usuario';

UPDATE Usuarios 
SET Email = 'demo_test_actualizado@aethelgard.com'
WHERE NombreUsuario = 'operario_demo_test';

-- Consultar la auditoría generada en AuditoriaDatos
SELECT 'Demo 3 - Email Modificado' AS Test, LogID, TablaAfectada, Accion, DatosAnteriores, DatosNuevos 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'Usuarios' AND Accion = 'UPDATE';
GO


-- =========================================================================
-- DEMOSTRACIÓN 4: tr_Audit_Roles_Insert
-- Descripción: Audita la creación de un nuevo Rol en la tabla Roles en JSON.
-- =========================================================================
PRINT '--> Demo 4: Creación de un nuevo Rol';

INSERT INTO Roles (NombreRol, Descripcion)
VALUES ('Rol_Temporal_Demo', 'Rol creado temporalmente para comprobar los triggers de auditoría de roles.');

-- Consultar la auditoría generada en AuditoriaDatos
SELECT 'Demo 4 - Rol Creado' AS Test, LogID, TablaAfectada, Accion, DatosNuevos 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'Roles' AND Accion = 'INSERT';
GO


-- =========================================================================
-- DEMOSTRACIÓN 5: tr_Audit_Roles_Update
-- Descripción: Audita los cambios realizados en un Rol en JSON.
-- =========================================================================
PRINT '--> Demo 5: Modificación de un Rol';

UPDATE Roles 
SET Descripcion = 'Descripción modificada para la prueba de triggers.'
WHERE NombreRol = 'Rol_Temporal_Demo';

-- Consultar la auditoría generada en AuditoriaDatos
SELECT 'Demo 5 - Rol Modificado' AS Test, LogID, TablaAfectada, Accion, DatosAnteriores, DatosNuevos 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'Roles' AND Accion = 'UPDATE';
GO


-- =========================================================================
-- DEMOSTRACIÓN 6: tr_Audit_Roles_Delete
-- Descripción: Audita la eliminación de un Rol guardando los datos borrados.
-- =========================================================================
PRINT '--> Demo 6: Eliminación de un Rol';

DELETE FROM Roles 
WHERE NombreRol = 'Rol_Temporal_Demo';

-- Consultar la auditoría generada en AuditoriaDatos
SELECT 'Demo 6 - Rol Eliminado' AS Test, LogID, TablaAfectada, Accion, DatosAnteriores 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'Roles' AND Accion = 'DELETE';
GO


-- =========================================================================
-- DEMOSTRACIÓN 7: tr_Login_ActualizarUltimoAcceso
-- Descripción: Al ingresar un login exitoso en HistorialLogins, el trigger
--              actualiza automáticamente el campo UltimoAcceso en Usuarios.
-- =========================================================================
PRINT '--> Demo 7: Automatización - Actualizar Último Acceso';

DECLARE @DemoUserID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_demo_test');

-- Insertamos un login exitoso
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente)
VALUES (@DemoUserID, 'operario_demo_test', 1, '192.168.45.10', 'Terminal Corporativa');

-- Verificamos si la fecha de acceso se actualizó en la tabla Usuarios
SELECT 'Demo 7 - Último Acceso Actualizado' AS Test, UsuarioID, NombreUsuario, UltimoAcceso 
FROM Usuarios 
WHERE UsuarioID = @DemoUserID;
GO


-- =========================================================================
-- DEMOSTRACIÓN 8: tr_Login_AlertaIntentoSospechoso
-- Descripción: Si un inicio de sesión es exitoso, pero con una dirección IP
--              diferente a la del login anterior, se registra una advertencia
--              en AuditoriaSesiones de tipo 'ACCESO_SOSPECHOSO'.
-- =========================================================================
PRINT '--> Demo 8: Automatización - Alerta por Cambio de IP (Sospechoso)';

DECLARE @DemoUserID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_demo_test');

-- Registramos un login exitoso con una IP diferente (la anterior fue 192.168.45.10)
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente)
VALUES (@DemoUserID, 'operario_demo_test', 1, '200.5.120.7', 'Terminal Móvil');

-- Consultamos la auditoría de sesiones buscando la alerta sospechosa
SELECT 'Demo 8 - Acceso Sospechoso Logged' AS Test, AuditoriaID, UsuarioID, TipoEvento, Detalle, DireccionIP 
FROM AuditoriaSesiones 
WHERE UsuarioID = @DemoUserID AND TipoEvento = 'ACCESO_SOSPECHOSO';
GO


-- =========================================================================
-- DEMOSTRACIÓN 9: tr_Login_BloqueoAutomatico
-- Descripción: Si un usuario registra 3 inicios de sesión fallidos de manera
--              consecutiva, el trigger actualiza su estado en Usuarios a
--              'BLOQUEADO' y escribe la auditoría de bloqueo de cuenta.
-- =========================================================================
PRINT '--> Demo 9: Automatización - Bloqueo de Cuenta por Reintentos Fallidos';

DECLARE @DemoUserID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_demo_test');

-- Verificamos el estado actual
SELECT 'Demo 9 - Estado Inicial' AS Test, NombreUsuario, Estado FROM Usuarios WHERE UsuarioID = @DemoUserID;

-- Insertamos 3 intentos fallidos consecutivos
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente, DetalleError)
VALUES (@DemoUserID, 'operario_demo_test', 0, '192.168.45.10', 'Terminal Corp', 'Clave Errónea');
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente, DetalleError)
VALUES (@DemoUserID, 'operario_demo_test', 0, '192.168.45.10', 'Terminal Corp', 'Clave Errónea');
INSERT INTO HistorialLogins (UsuarioID, NombreUsuarioIngresado, Exitoso, DireccionIP, DispositivoCliente, DetalleError)
VALUES (@DemoUserID, 'operario_demo_test', 0, '192.168.45.10', 'Terminal Corp', 'Clave Errónea');

-- Comprobamos si el estado cambió a BLOQUEADO y si se insertó el log
SELECT 'Demo 9 - Estado Final' AS Test, NombreUsuario, Estado 
FROM Usuarios 
WHERE UsuarioID = @DemoUserID;

SELECT 'Demo 9 - Log de Bloqueo' AS Test, UsuarioID, TipoEvento, Detalle, DireccionIP 
FROM AuditoriaSesiones 
WHERE UsuarioID = @DemoUserID AND TipoEvento = 'BLOQUEO_CUENTA';
GO


-- =========================================================================
-- DEMOSTRACIÓN 10: tr_Seguridad_ContrasenaFormato
-- Descripción: Valida que la contraseña guardada no sea insegura. 
--              Si tiene menos de 8 caracteres, se hace ROLLBACK de la transacción.
-- =========================================================================
PRINT '--> Demo 10: Seguridad - Longitud Mínima de Contraseña (Falla)';

BEGIN TRY
    -- Intentamos insertar un usuario con contraseña de 4 letras
    INSERT INTO Usuarios (NombreUsuario, Email, PasswordHash, Estado)
    VALUES ('operario_secur_test', 'secur@aethelgard.com', '1234', 'ACTIVO');
END TRY
BEGIN CATCH
    SELECT 'Demo 10 - Error Capturado' AS Test, ERROR_MESSAGE() AS MensajeError;
END CATCH;
GO


-- =========================================================================
-- DEMOSTRACIÓN 11: tr_Seguridad_EvitarUpdateUsuarioID
-- Descripción: Bloquea intentos de cambiar manualmente el campo UsuarioID
--              para mantener la coherencia relacional.
-- =========================================================================
PRINT '--> Demo 11: Seguridad - Bloqueo de Modificación de UsuarioID (Falla)';

DECLARE @DemoUserID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_demo_test');

BEGIN TRY
    -- Intentamos cambiar el ID del usuario
    UPDATE Usuarios 
    SET UsuarioID = 99999
    WHERE UsuarioID = @DemoUserID;
END TRY
BEGIN CATCH
    SELECT 'Demo 11 - Error Capturado' AS Test, ERROR_MESSAGE() AS MensajeError;
END CATCH;
GO


-- =========================================================================
-- DEMOSTRACIÓN 12: tr_Seguridad_EvitarEliminarAdmin
-- Descripción: Impide la eliminación del rol de sistema 'Administrador'.
-- =========================================================================
PRINT '--> Demo 12: Seguridad - Evitar Eliminar Rol Administrador (Falla)';

BEGIN TRY
    -- Intentamos borrar el rol de Administrador
    DELETE FROM Roles 
    WHERE NombreRol = 'Administrador';
END TRY
BEGIN CATCH
    SELECT 'Demo 12 - Error Capturado' AS Test, ERROR_MESSAGE() AS MensajeError;
END CATCH;
GO


-- =========================================================================
-- DEMOSTRACIÓN 13: tr_Seguridad_EvitarEliminarUltimoAdmin
-- Descripción: Previene que la base de datos quede huérfana de administradores
--              impidiendo borrar al único usuario con ese rol.
-- =========================================================================
PRINT '--> Demo 13: Seguridad - Evitar dejar el sistema sin Administrador (Falla)';

BEGIN TRY
    -- Intentamos borrar a los asignados del Rol Administrador (el Administrador de semilla)
    DECLARE @IdRolAdmin INT = (SELECT RolID FROM Roles WHERE NombreRol = 'Administrador');
    
    DELETE FROM UsuarioRoles 
    WHERE RolID = @IdRolAdmin;
END TRY
BEGIN CATCH
    SELECT 'Demo 13 - Error Capturado' AS Test, ERROR_MESSAGE() AS MensajeError;
END CATCH;
GO


-- =========================================================================
-- DEMOSTRACIÓN 14: tr_Audit_UsuarioRoles_Delete
-- Descripción: Audita la eliminación de la asociación de rol de un usuario
--              guardando los datos en formato JSON en AuditoriaDatos.
-- =========================================================================
PRINT '--> Demo 14: Eliminación de Rol asignado (Auditoría)';

DECLARE @DemoUserID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_demo_test');

-- Desvinculamos el rol Jugador al usuario de demo
DELETE FROM UsuarioRoles 
WHERE UsuarioID = @DemoUserID;

-- Consultar la auditoría generada en AuditoriaDatos
SELECT 'Demo 14 - Rol Desasignado' AS Test, LogID, TablaAfectada, Accion, DatosAnteriores 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'UsuarioRoles' AND Accion = 'DELETE';
GO


-- =========================================================================
-- DEMOSTRACIÓN 15: tr_Audit_Usuarios_Delete
-- Descripción: Audita la eliminación completa de un registro de usuario
--              guardando sus datos en formato JSON en AuditoriaDatos.
-- =========================================================================
PRINT '--> Demo 15: Eliminación de Registro de Usuario';

DECLARE @DemoUserID INT = (SELECT UsuarioID FROM Usuarios WHERE NombreUsuario = 'operario_demo_test');

-- Primero limpiamos dependencias de login/auditoría para que permita el delete relacional
DELETE FROM HistorialLogins WHERE UsuarioID = @DemoUserID;
DELETE FROM AuditoriaSesiones WHERE UsuarioID = @DemoUserID;

-- Borramos al usuario de prueba
DELETE FROM Usuarios WHERE UsuarioID = @DemoUserID;

-- Consultar la auditoría generada en AuditoriaDatos
SELECT 'Demo 15 - Usuario Eliminado' AS Test, LogID, TablaAfectada, Accion, DatosAnteriores 
FROM AuditoriaDatos 
WHERE TablaAfectada = 'Usuarios' AND Accion = 'DELETE';
GO


-- =========================================================================
-- LIMPIEZA FINAL DE ENTIDAD DE PRUEBAS
-- =========================================================================
DELETE FROM AuditoriaDatos WHERE TablaAfectada IN ('Usuarios', 'UsuarioRoles', 'Roles');
PRINT '=========================================================================';
PRINT 'FIN DE LA DEMOSTRACIÓN INDIVIDUAL DE TRIGGERS - DATOS LIMPIADOS';
PRINT '=========================================================================';
GO
