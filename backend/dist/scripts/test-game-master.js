"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gemini_service_1 = require("../services/gemini.service");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
async function testGameMaster() {
    console.log('Testing queryGameMaster with fallback chain and recursive JSON parsing...');
    try {
        const response = await (0, gemini_service_1.queryGameMaster)({ sanity: 100, compliance: 50, credits: 100, netPulse: 100 }, [], 'START_SCENARIO: GENERAR_NUEVO_ESCENARIO', false, [], []);
        console.log('\n--- Success Response ---');
        console.log(JSON.stringify(response, null, 2));
    }
    catch (err) {
        console.error('Test script caught error:', err);
    }
}
testGameMaster();
