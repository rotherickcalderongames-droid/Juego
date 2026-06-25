"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const gemini_service_1 = require("./services/gemini.service");
async function test() {
    console.log("Starting avatar generation test...");
    try {
        const avatar = await (0, gemini_service_1.generateAvatar)("masculino");
        console.log("Avatar generation successful!");
        console.log("Result starts with:", avatar.substring(0, 100));
        console.log("Result length:", avatar.length);
    }
    catch (error) {
        console.error("Test failed:", error);
    }
}
test();
