-- =========================================================================
-- SCRIPT DE MANTENIMIENTO: RESETEO DE CONTADORES DE IDENTIDAD (RESEED)
-- Este script resetea los contadores de identidad (IDENTITY) al valor máximo actual
-- de cada tabla para evitar problemas de duplicidad o saltos en la numeración.
-- =========================================================================

-- 1. RESETEO ESPECÍFICO DE LA TABLA 'Usuarios'
-- =========================================================================
USE NeoBandersnatchSecurity;
GO

PRINT '--- Iniciando reseteo de identidad para la tabla Usuarios ---';

DECLARE @MaxUsuarioID BIGINT;
-- Obtenemos el ID máximo actual de la tabla Usuarios (si está vacía, iniciará en 0)
SELECT @MaxUsuarioID = ISNULL(MAX(UsuarioID), 0) FROM Usuarios;

-- Reseteamos el contador de identidad al ID máximo actual.
-- El próximo registro insertado tendrá el valor de (@MaxUsuarioID + 1).
DBCC CHECKIDENT ('Usuarios', RESEED, @MaxUsuarioID);

PRINT 'Tabla Usuarios reseteada con éxito. Último ID asignado: ' + CAST(@MaxUsuarioID AS VARCHAR(20));
GO


-- 2. RESETEO DINÁMICO DE TODAS LAS TABLAS CON COLUMNAS DE IDENTIDAD
-- =========================================================================
PRINT '--- Iniciando reseteo dinámico para todas las tablas en la base de datos ---';

DECLARE @TableName NVARCHAR(256);
DECLARE @ColumnName NVARCHAR(256);
DECLARE @DynamicSQL NVARCHAR(MAX);

-- Cursor para iterar sobre todas las tablas que poseen columnas autoincrementales (IDENTITY)
DECLARE identity_cursor CURSOR FOR 
SELECT 
    t.name AS TableName,
    c.name AS ColumnName
FROM 
    sys.schemas s
INNER JOIN 
    sys.tables t ON s.schema_id = t.schema_id
INNER JOIN 
    sys.identity_columns c ON t.object_id = c.object_id
WHERE
    t.is_ms_shipped = 0; -- Excluir tablas del sistema de SQL Server

OPEN identity_cursor;  
FETCH NEXT FROM identity_cursor INTO @TableName, @ColumnName;  

WHILE @@FETCH_STATUS = 0  
BEGIN  
    -- Generar el SQL dinámico para obtener el valor máximo e incrementar el contador correctamente
    SET @DynamicSQL = N'
        DECLARE @MaxVal BIGINT;
        DECLARE @SelectSQL NVARCHAR(MAX);
        
        -- Ejecutar selección dinámica para encontrar el valor máximo de la columna de identidad
        SET @SelectSQL = N''SELECT @MaxValOut = ISNULL(MAX('' + QUOTENAME(@ColName) + ''), 0) FROM '' + QUOTENAME(@TabName);
        EXEC sp_executesql @SelectSQL, N''@MaxValOut BIGINT OUTPUT'', @MaxValOut = @MaxVal OUTPUT;
        
        -- Ejecutar DBCC CHECKIDENT para la tabla actual con el valor máximo
        DBCC CHECKIDENT (@TabNameRaw, RESEED, @MaxVal);
        PRINT ''Tabla: '' + @TabNameRaw + '' | Columna: '' + @ColName + '' | Reseteada al valor: '' + CAST(@MaxVal AS VARCHAR(30));
    ';
    
    EXEC sp_executesql @DynamicSQL, 
        N'@TabName NVARCHAR(256), @ColName NVARCHAR(256), @TabNameRaw NVARCHAR(256)', 
        @TabName = @TableName, 
        @ColName = @ColumnName,
        @TabNameRaw = @TableName;

    FETCH NEXT FROM identity_cursor INTO @TableName, @ColumnName;  
END;  

CLOSE identity_cursor;  
DEALLOCATE identity_cursor;
PRINT '--- Proceso de reseteo dinámico completado con éxito ---';
GO
