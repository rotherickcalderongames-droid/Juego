import mongoose from 'mongoose';

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/neo_bandersnatch';
  
  try {
    await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected successfully to ${mongoUri}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    process.exit(1);
  }
}
