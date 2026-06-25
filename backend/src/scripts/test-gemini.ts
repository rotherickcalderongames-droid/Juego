import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function testGemini() {
  console.log('Testing Gemini API key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'None');
  if (!apiKey) {
    console.error('No Gemini API key found in .env');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent('Say hello in one word.');
    console.log('Success! Gemini response:', response.response.text().trim());
  } catch (error: any) {
    console.error('Gemini API Test Failed:', error);
  }
}

testGemini();
