import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './services/db.service';
import { connectSQL, getPool } from './services/mssql.service';
import { Session } from './models/models';

dotenv.config();

async function runTest() {
  console.log('[Test] Connecting to SQL Server...');
  await connectSQL();
  
  try {
    const pool = getPool();
    console.log('[Test] Listing seed roles from SQL Server...');
    const rolesResult = await pool.request().query('SELECT NombreRol FROM Roles');
    console.log('[Test] Roles found in database:', rolesResult.recordset.map((r: any) => r.NombreRol));
    
    console.log('[Test] Counting registered users in SQL Server...');
    const usersResult = await pool.request().query('SELECT COUNT(*) AS UserCount FROM Usuarios');
    console.log('[Test] Total users:', usersResult.recordset[0].UserCount);
    
    console.log('[Test] Connecting to MongoDB...');
    await connectDB();

    console.log('[Test] Counting game sessions in MongoDB...');
    const sessionsCount = await Session.countDocuments();
    console.log('[Test] Total game sessions:', sessionsCount);
    
    console.log('[Test] Hybrid persistence test execution completed successfully!');
  } catch (error) {
    console.error('[Test] Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[Test] Disconnected from MongoDB.');
    
    // Close SQL Server pool if open
    const pool = getPool();
    if (pool) {
      await pool.close();
      console.log('[Test] Disconnected from SQL Server.');
    }
  }
}

runTest();
