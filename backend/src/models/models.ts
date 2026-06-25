import mongoose, { Schema, Document } from 'mongoose';

// =========================================================================
// 1. GAME SESSIONS SCHEMA & MODEL
// =========================================================================
export interface ISession extends Document {
  userId: number; // Relational numeric UserID from SQL Server
  sanity: number;
  compliance: number;
  credits: number;
  netPulse: number;
  avatarUrl: string;
  status: 'ACTIVE' | 'FINISHED';
  dynamicState: Record<string, any>;
  createdAt: Date;
}

const SessionSchema: Schema = new Schema({
  userId: { type: Number, required: true, index: true }, // Referencing SQL Server's numeric ID
  sanity: { type: Number, default: 100, min: 0, max: 100 },
  compliance: { type: Number, default: 50, min: 0, max: 100 },
  credits: { type: Number, default: 100 },
  netPulse: { type: Number, default: 100, min: 0, max: 100 },
  avatarUrl: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'FINISHED'], default: 'ACTIVE' },
  dynamicState: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);

// =========================================================================
// 2. DECISION LOGS SCHEMA & MODEL
// =========================================================================
export interface IDecisionLog extends Document {
  sessionId: mongoose.Types.ObjectId;
  stepNumber: number;
  commandTyped: string;
  situationText: string;
  statsChanges: {
    sanity: number;
    compliance: number;
    credits: number;
    netPulse: number;
  };
  timestamp: Date;
}

const DecisionLogSchema: Schema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  stepNumber: { type: Number, required: true },
  commandTyped: { type: String, required: true },
  situationText: { type: String, required: true },
  statsChanges: {
    sanity: { type: Number, default: 0 },
    compliance: { type: Number, default: 0 },
    credits: { type: Number, default: 0 },
    netPulse: { type: Number, default: 0 }
  },
  timestamp: { type: Date, default: Date.now }
});

export const DecisionLog = mongoose.model<IDecisionLog>('DecisionLog', DecisionLogSchema);

// =========================================================================
// 3. UNLOCKED ENDINGS SCHEMA & MODEL
// =========================================================================
export interface IUnlockedEnding extends Document {
  userId: number; // Relational numeric UserID from SQL Server
  endingId: string;
  title: string;
  description: string;
  unlockedAt: Date;
}

const UnlockedEndingSchema: Schema = new Schema({
  userId: { type: Number, required: true, index: true }, // Referencing SQL Server's numeric ID
  endingId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now }
});

// Unique index to prevent duplicate achievements for the same user-ending combination
UnlockedEndingSchema.index({ userId: 1, endingId: 1 }, { unique: true });

export const UnlockedEnding = mongoose.model<IUnlockedEnding>('UnlockedEnding', UnlockedEndingSchema);
