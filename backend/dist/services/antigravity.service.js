"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAndProcessLoops = detectAndProcessLoops;
const models_1 = require("../models/models");
/**
 * Detects if the player is stuck in a decision loop (1-cycle or 2-cycle)
 * over the last 5 turns, and applies penalties to Sanity and NetPulse.
 * Returns true if a loop is detected, false otherwise.
 */
async function detectAndProcessLoops(sessionId) {
    try {
        const logs = await models_1.DecisionLog.find({ sessionId })
            .sort({ stepNumber: -1 })
            .limit(5);
        // If there are fewer than 5 steps, there can't be a 5-step loop
        if (logs.length < 5) {
            return false;
        }
        // Commands in chronological order from oldest (index 4) to newest (index 0)
        const commands = logs.map(l => l.commandTyped.trim().toLowerCase());
        // 1-cycle loop: same command repeated 5 times (e.g. ['1', '1', '1', '1', '1'])
        const isOneCycle = commands.every(c => c === commands[0]);
        // 2-cycle loop: alternating commands (e.g. ['1', '2', '1', '2', '1'])
        const isTwoCycle = commands[0] === commands[2] &&
            commands[2] === commands[4] &&
            commands[1] === commands[3] &&
            commands[0] !== commands[1];
        if (isOneCycle || isTwoCycle) {
            console.log(`[Antigravity Active] Loop detected: ${JSON.stringify(commands)}`);
            // Apply penalties: Deduct sanity and netPulse
            const session = await models_1.Session.findById(sessionId);
            if (session) {
                // Linear deduction of Sanity (-20) and NetPulse (-25)
                session.sanity = Math.max(0, session.sanity - 20);
                session.netPulse = Math.max(0, session.netPulse - 25);
                // Also inject a flag inside dynamicState to let other systems know
                session.dynamicState = {
                    ...session.dynamicState,
                    antigravityTriggered: true,
                    loopDetectedAt: new Date()
                };
                await session.save();
                console.log(`[Antigravity Active] Applied stats penalties. Sanity: ${session.sanity}, NetPulse: ${session.netPulse}`);
            }
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('[Antigravity] Loop detection error:', error);
        return false;
    }
}
