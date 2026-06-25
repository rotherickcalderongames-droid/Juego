"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_service_1 = require("./services/db.service");
const mssql_service_1 = require("./services/mssql.service");
const models_1 = require("./models/models");
dotenv_1.default.config();
async function runTest() {
    console.log('[Test] Connecting to SQL Server...');
    await (0, mssql_service_1.connectSQL)();
    try {
        const pool = (0, mssql_service_1.getPool)();
        console.log('[Test] Listing seed roles from SQL Server...');
        const rolesResult = await pool.request().query('SELECT NombreRol FROM Roles');
        console.log('[Test] Roles found in database:', rolesResult.recordset.map((r) => r.NombreRol));
        console.log('[Test] Counting registered users in SQL Server...');
        const usersResult = await pool.request().query('SELECT COUNT(*) AS UserCount FROM Usuarios');
        console.log('[Test] Total users:', usersResult.recordset[0].UserCount);
        console.log('[Test] Connecting to MongoDB...');
        await (0, db_service_1.connectDB)();
        console.log('[Test] Counting game sessions in MongoDB...');
        const sessionsCount = await models_1.Session.countDocuments();
        console.log('[Test] Total game sessions:', sessionsCount);
        console.log('[Test] Hybrid persistence test execution completed successfully!');
    }
    catch (error) {
        console.error('[Test] Verification failed:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('[Test] Disconnected from MongoDB.');
        // Close SQL Server pool if open
        const pool = (0, mssql_service_1.getPool)();
        if (pool) {
            await pool.close();
            console.log('[Test] Disconnected from SQL Server.');
        }
    }
}
runTest();
