"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDB() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/neo_bandersnatch';
    try {
        await mongoose_1.default.connect(mongoUri);
        console.log(`[MongoDB] Connected successfully to ${mongoUri}`);
    }
    catch (error) {
        console.error('[MongoDB] Connection error:', error);
        process.exit(1);
    }
}
