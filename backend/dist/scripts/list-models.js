"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const apiKey = process.env.GEMINI_API_KEY;
async function listModels() {
    if (!apiKey) {
        console.error('No API key found');
        return;
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log('Available models for your API key:');
        if (data.models) {
            for (const m of data.models) {
                console.log(`- Name: ${m.name}, DisplayName: ${m.displayName}, SupportedMethods: ${m.supportedGenerationMethods.join(', ')}`);
            }
        }
        else {
            console.log('No models returned. Data:', JSON.stringify(data, null, 2));
        }
    }
    catch (err) {
        console.error('Error fetching models:', err.message);
    }
}
listModels();
