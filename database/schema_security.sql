-- Esquema Relacional de Seguridad y Accesos para Neo-Bandersnatch (SQL Server)
-- Materia: Tecnología de Base de Datos I (UPDS)
-- Versión: 4.5 (Con Vistas de Seguridad, Índices, Sinónimos y Directivas de Encriptación)

-- =========================================================================
-- TABLA 1: Roles
-- =========================================================================
CREATE TABLE Roles (
    RolID INT IDENTITY(1,1) PRIMARY KEY, -- Clave primaria (Índice agrupado automático)
    NombreRol VARCHAR(50) NOT NULL UNIQUE,
    Descripcion VARCHAR(255) NULL,
    FechaCreacion DATETIME DEFAULT GETDATE()
);

-- =========================================================================
-- TABLA 2: Usuarios
-- Implementa directivas de ofuscación y almacenamiento seguro
-- =========================================================================
CREATE TABLE Usuarios (
    UsuarioID INT IDENTITY(1,1) PRIMARY KEY, -- Clave primaria (Índice agrupado automático)
    NombreUsuario VARCHAR(50) NOT NULL UNIQUE,
    Email VARCHAR(100) NOT NULL UNIQUE,
    
    -- En producción real, PasswordHash está cifrado nativamente usando Always Encrypted (AES-256):
    -- PasswordHash VARCHAR(255) ENCRYPTED WITH (
    --     COLUMN_ENCRYPTION_KEY = [CEK_Bandersnatch], 
    --     ENCRYPTION_TYPE = DETERMINISTIC, 
    --     ALGORITHM = 'AEAD_AES_256_CBC_HMAC_SHA_256'
    -- ) NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    
    Estado VARCHAR(20) DEFAULT 'ACTIVO' CHECK (Estado IN ('ACTIVO', 'BLOQUEADO', 'INACTIVO')),
    FechaRegistro DATETIME DEFAULT GETDATE(),
    UltimoAcceso DATETIME NULL
);

-- =========================================================================
-- TABLA 3: UsuarioRoles
-- =========================================================================
CREATE TABLE UsuarioRoles (
    UsuarioID INT NOT NULL,
    RolID INT NOT NULL,
    AsignadoEl DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (UsuarioID, RolID),
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID) ON DELETE CASCADE,
    FOREIGN KEY (RolID) REFERENCES Roles(RolID) ON DELETE CASCADE
);

-- =========================================================================
-- TABLA 4: HistorialLogins
-- =========================================================================
CREATE TABLE HistorialLogins (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioID INT NULL,
    NombreUsuarioIngresado VARCHAR(50) NOT NULL,
    FechaIntento DATETIME DEFAULT GETDATE(),
    Exitoso BIT NOT NULL,
    DireccionIP VARCHAR(45) NOT NULL,
    DispositivoCliente VARCHAR(255) NULL,
    DetalleError VARCHAR(150) NULL,
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID) ON DELETE SET NULL
);

-- =========================================================================
-- TABLA 5: AuditoriaSesiones
-- =========================================================================
CREATE TABLE AuditoriaSesiones (
    AuditoriaID INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioID INT NOT NULL,
    TipoEvento VARCHAR(50) NOT NULL, -- Ej: 'CAMBIO_PASSWORD', 'BLOQUEO_CUENTA'
    Detalle VARCHAR(500) NOT NULL,
    FechaEvento DATETIME DEFAULT GETDATE(),
    DireccionIP VARCHAR(45) NOT NULL,
    FOREIGN KEY (UsuarioID) REFERENCES Usuarios(UsuarioID) ON DELETE CASCADE
);

-- =========================================================================
-- ESTRATEGIAS DE INDEXACIÓN AVANZADA
-- Optimiza consultas frecuentes y búsquedas de credenciales
-- =========================================================================
-- Índice No Agrupado para la búsqueda rápida de nombres de usuario en login
CREATE NONCLUSTERED INDEX IX_Usuarios_NombreUsuario ON Usuarios(NombreUsuario);

-- Índice No Agrupado para la validación de correos electrónicos únicos
CREATE NONCLUSTERED INDEX IX_Usuarios_Email ON Usuarios(Email);

-- Índice No Agrupado para reportes cronológicos de inicios de sesión
CREATE NONCLUSTERED INDEX IX_HistorialLogins_Fecha ON HistorialLogins(FechaIntento);

-- Índice No Agrupado para auditorías rápidas por ID de usuario
CREATE NONCLUSTERED INDEX IX_AuditoriaSesiones_Usuario ON AuditoriaSesiones(UsuarioID);

-- =========================================================================
-- VISTAS DE SEGURIDAD (Aislamiento de Capa Física)
-- Omiten datos personales en texto plano e información sensible (hashes)
-- =========================================================================
GO
-- Vista para la consulta de información general del usuario sin exponer PasswordHash
CREATE VIEW v_UsuariosSeguros AS
SELECT 
    UsuarioID, 
    NombreUsuario, 
    Email, 
    Estado, 
    FechaRegistro, 
    UltimoAcceso
FROM Usuarios;
GO

-- Vista para consolidar el historial de auditoría asociando datos legibles del usuario
CREATE VIEW v_AuditoriaReciente AS
SELECT 
    A.AuditoriaID, 
    U.NombreUsuario, 
    A.TipoEvento, 
    A.Detalle, 
    A.FechaEvento, 
    A.DireccionIP
FROM AuditoriaSesiones A
INNER JOIN Usuarios U ON A.UsuarioID = U.UsuarioID;
GO

-- =========================================================================
-- SINÓNIMOS DE INFRAESTRUCTURA (Abstracción del Esquema Físico)
-- =========================================================================
CREATE SYNONYM Syn_Usuarios FOR dbo.Usuarios;
CREATE SYNONYM Syn_Roles FOR dbo.Roles;
CREATE SYNONYM Syn_Auditoria FOR dbo.AuditoriaSesiones;
CREATE SYNONYM Syn_VistaUsuarios FOR dbo.v_UsuariosSeguros;

-- =========================================================================
-- INSERCIONES DE SEMILLA (Seed Data)
-- =========================================================================
INSERT INTO Roles (NombreRol, Descripcion) VALUES 
('Administrador', 'Acceso total al sistema, auditorías y control de usuarios.'),
('Jugador', 'Permiso estándar para iniciar partidas, guardar logs de juego y desbloquear finales.'),
('IA_Monitor', 'Rol del sistema para auditoría automática de partidas.');
