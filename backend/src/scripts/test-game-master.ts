import { queryGameMaster } from '../services/gemini.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testGameMaster() {
  console.log('Testing queryGameMaster with fallback chain and recursive JSON parsing...');
  try {
    const response = await queryGameMaster(
      { sanity: 100, compliance: 50, credits: 100, netPulse: 100 },
      [],
      'START_SCENARIO: GENERAR_NUEVO_ESCENARIO',
      false,
      [],
      []
    );
    console.log('\n--- Success Response ---');
    console.log(JSON.stringify(response, null, 2));
  } catch (err: any) {
    console.error('Test script caught error:', err);
  }
}

testGameMaster();
