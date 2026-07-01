"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from backend/.env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const config = {
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || '123456',
    server: process.env.MSSQL_SERVER || '127.0.0.1',
    database: process.env.MSSQL_DATABASE || 'NeoBandersnatchSecurity',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: true
    }
};
async function runReset() {
    console.log('\x1b[32m========================================================\x1b[0m');
    console.log('\x1b[36m   NEO-BANDERSNATCH DATABASE UTILITY: IDENTITY RESET\x1b[0m');
    console.log('\x1b[32m========================================================\x1b[0m');
    console.log(`Connecting to SQL Server at \x1b[33m${config.server}:${config.port}\x1b[0m...`);
    console.log(`Target database: \x1b[35m${config.database}\x1b[0m`);
    let pool = null;
    try {
        pool = await new mssql_1.default.ConnectionPool(config).connect();
        console.log('\x1b[32m[+] Connected successfully to SQL Server!\x1b[0m\n');
        // 1. Reset Usuarios identity
        console.log('\x1b[36m[1/2] Resetting identity for table: "Usuarios"...\x1b[0m');
        const resetUsuariosQuery = `
      DECLARE @MaxUsuarioID BIGINT;
      SELECT @MaxUsuarioID = ISNULL(MAX(UsuarioID), 0) FROM Usuarios;
      DBCC CHECKIDENT ('Usuarios', RESEED, @MaxUsuarioID);
      SELECT @MaxUsuarioID AS NewSeed;
    `;
        const resUsuarios = await pool.request().query(resetUsuariosQuery);
        const newSeedUser = resUsuarios.recordset[0]?.NewSeed;
        console.log(`\x1b[32m[✔] "Usuarios" identity counter reseeded to max ID: ${newSeedUser}\x1b[0m\n`);
        // 2. Reset all tables dynamically
        console.log('\x1b[36m[2/2] Resetting identity for all tables in database...\x1b[0m');
        const dynamicReseedQuery = `
      DECLARE @TableName NVARCHAR(256);
      DECLARE @ColumnName NVARCHAR(256);
      DECLARE @SQL NVARCHAR(MAX);
      
      CREATE TABLE #Results (TableName NVARCHAR(256), IdentityColumn NVARCHAR(256), NewSeed BIGINT);

      DECLARE db_cursor CURSOR FOR 
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
          t.is_ms_shipped = 0;

      OPEN db_cursor;  
      FETCH NEXT FROM db_cursor INTO @TableName, @ColumnName;  

      WHILE @@FETCH_STATUS = 0  
      BEGIN  
          SET @SQL = N'
              DECLARE @MaxVal BIGINT;
              SELECT @MaxVal = ISNULL(MAX(' + QUOTENAME(@ColumnName) + '), 0) FROM ' + QUOTENAME(@TableName) + ';
              DBCC CHECKIDENT (''' + REPLACE(@TableName, '''', '''''') + ''', RESEED, @MaxVal);
              INSERT INTO #Results VALUES (''' + REPLACE(@TableName, '''', '''''') + ''', ''' + REPLACE(@ColumnName, '''', '''''') + ''', @MaxVal);
          ';
          
          EXEC sp_executesql @SQL;

          FETCH NEXT FROM db_cursor INTO @TableName, @ColumnName;  
      END;  

      CLOSE db_cursor;  
      DEALLOCATE db_cursor;

      SELECT * FROM #Results;
      DROP TABLE #Results;
    `;
        const resAll = await pool.request().query(dynamicReseedQuery);
        console.log('\x1b[32m[✔] Dynamic reseed completed successfully for all tables:\x1b[0m');
        console.log('\n┌──────────────────────────────┬──────────────────────────────┬─────────────┐');
        console.log('│ Table Name                   │ Identity Column              │ New Max ID  │');
        console.log('├──────────────────────────────┼──────────────────────────────┼─────────────┤');
        for (const row of resAll.recordset) {
            const table = row.TableName.padEnd(28);
            const column = row.IdentityColumn.padEnd(28);
            const seed = String(row.NewSeed).padEnd(11);
            console.log(`│ ${table} │ ${column} │ ${seed} │`);
        }
        console.log('└──────────────────────────────┴──────────────────────────────┴─────────────┘');
    }
    catch (err) {
        console.error('\n\x1b[31m[-] Error executing identity reset:\x1b[0m', err.message);
    }
    finally {
        if (pool) {
            await pool.close();
            console.log('\n\x1b[33mConnection closed.\x1b[0m');
        }
        console.log('\x1b[32m========================================================\x1b[0m');
    }
}
runReset();
