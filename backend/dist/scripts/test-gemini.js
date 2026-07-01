"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const apiKey = process.env.GEMINI_API_KEY;
async function testGemini() {
    console.log('Testing Gemini API key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'None');
    if (!apiKey) {
        console.error('No Gemini API key found in .env');
        return;
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const response = await model.generateContent('Say hello in one word.');
        console.log('Success! Gemini response:', response.response.text().trim());
    }
    catch (error) {
        console.error('Gemini API Test Failed:', error);
    }
}
testGemini();
