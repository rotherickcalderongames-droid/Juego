"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectSQL = connectSQL;
exports.getPool = getPool;
const mssql_1 = __importDefault(require("mssql"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let pool = null;
let sqlConfig = null;
async function connectSQL() {
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
    sqlConfig = config;
    try {
        pool = await new mssql_1.default.ConnectionPool(config).connect();
        console.log(`[SQL Server] Connected successfully to ${config.server}:${config.port}/${config.database}`);
        // Auto-create database tables if schema is not present
        await initializeSchema();
    }
    catch (error) {
        console.error('[SQL Server] Connection failed:', error);
        process.exit(1);
    }
}
function getPool() {
    if (!pool) {
        throw new Error('[SQL Server] Connection pool not initialized. Call connectSQL first.');
    }
    return pool;
}
async function initializeSchema() {
    if (!pool)
        return;
    try {
        // Check if table "Roles" exists as a proxy to see if schema is created
        const checkTableResult = await pool.request().query(`SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Roles'`);
        if (checkTableResult.recordset.length === 0) {
            console.log('[SQL Server] Schema not found. Initializing schema_security.sql...');
            // Read schema file
            const schemaPath = path_1.default.resolve(__dirname, '../../../../database/schema_security.sql');
            if (!fs_1.default.existsSync(schemaPath)) {
                throw new Error(`Schema file not found at path: ${schemaPath}`);
            }
            const rawSql = fs_1.default.readFileSync(schemaPath, 'utf8');
            // Split by 'GO' statement (case-insensitive boundary)
            const queries = rawSql.split(/\bGO\b/i);
            for (let query of queries) {
                query = query.trim();
                if (query) {
                    try {
                        await pool.request().query(query);
                    }
                    catch (queryErr) {
                        // Ignore database creation error if already exists, but log other errors
                        if (query.toUpperCase().includes('CREATE DATABASE') && queryErr.message.includes('already exists')) {
                            continue;
                        }
                        console.error('[SQL Server Schema Init] Query failed:', queryErr.message, '\nQuery:', query);
                        throw queryErr;
                    }
                }
            }
            console.log('[SQL Server] Schema security initialized and seeded successfully.');
        }
        else {
            console.log('[SQL Server] Schema already exists. Skipping initialization.');
        }
    }
    catch (error) {
        console.error('[SQL Server] Schema initialization failed:', error);
        throw error;
    }
}
