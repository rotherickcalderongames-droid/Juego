import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  if (!apiKey) {
    console.error('No API key found');
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data: any = await res.json();
    console.log('Available models for your API key:');
    if (data.models) {
      for (const m of data.models) {
        console.log(`- Name: ${m.name}, DisplayName: ${m.displayName}, SupportedMethods: ${m.supportedGenerationMethods.join(', ')}`);
      }
    } else {
      console.log('No models returned. Data:', JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error('Error fetching models:', err.message);
  }
}

listModels();
