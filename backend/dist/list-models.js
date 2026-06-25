"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Models found:");
        if (data.models) {
            for (const m of data.models) {
                console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods?.join(', ')})`);
            }
        }
        else {
            console.log(data);
        }
    }
    catch (err) {
        console.error(err);
    }
}
main();
