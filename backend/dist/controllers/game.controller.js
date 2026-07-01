"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHOP_ITEMS = void 0;
exports.startGame = startGame;
exports.processCommand = processCommand;
exports.getUnlockedEndings = getUnlockedEndings;
exports.getActiveSession = getActiveSession;
exports.getShopItems = getShopItems;
exports.buyItem = buyItem;
const models_1 = require("../models/models");
const gemini_service_1 = require("../services/gemini.service");
const antigravity_service_1 = require("../services/antigravity.service");
const mssql_1 = __importDefault(require("mssql"));
const mssql_service_1 = require("../services/mssql.service");
async function startGame(req, res) {
    const userId = req.user?.userId;
    const username = req.user?.username;
    const { resume, forceNew, gender } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (userId === undefined || userId === null) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        // 1. Resume existing session if requested
        if (resume === true) {
            const activeSession = await models_1.Session.findOne({ userId, status: 'ACTIVE' });
            if (activeSession) {
                const lastNarrative = activeSession.dynamicState?.lastNarrative;
                if (lastNarrative) {
                    // SQL Server Session Audit Log
                    await pool.request()
                        .input('usuarioId', mssql_1.default.Int, userId)
                        .input('eventType', mssql_1.default.VarChar, 'REANUDAR_PARTIDA')
                        .input('detail', mssql_1.default.VarChar, `Partida reanudada. Sesión ID: ${activeSession._id}`)
                        .input('ipAddress', mssql_1.default.VarChar, ipAddress)
                        .query(`
              INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
              VALUES (@usuarioId, @eventType, @detail, GETDATE(), @ipAddress)
            `);
                    return res.status(200).json({
                        sessionId: activeSession._id,
                        stats: {
                            sanity: activeSession.sanity,
                            compliance: activeSession.compliance,
                            credits: activeSession.credits,
                            netPulse: activeSession.netPulse
                        },
                        avatarUrl: activeSession.avatarUrl,
                        avatarConfig: activeSession.dynamicState?.avatarConfig || null,
                        implants: activeSession.dynamicState?.implants || [],
                        narrative: lastNarrative
                    });
                }
            }
        }
        // 2. Start a fresh new session
        const existingActive = await models_1.Session.findOne({ userId, status: 'ACTIVE' });
        if (existingActive) {
            return res.status(400).json({ error: 'Ya tienes una simulación activa en curso. Las decisiones en Neo-Bandersnatch son irreversibles; debes terminar tu destino actual (alcanzar un final o morir) antes de iniciar una nueva simulación.' });
        }
        // Fetch past sessions for the current user to cycle their base avatar images
        const pastSessions = await models_1.Session.find({ userId, status: 'FINISHED' });
        // Fetch all sessions globally to guarantee absolute uniqueness of stories and full avatar combinations across all players
        const allSessions = await models_1.Session.find({});
        const usedScenarios = allSessions.map(s => s.dynamicState?.startingScenario).filter(Boolean);
        // Expand the pool of starting scenarios to 15 different corporate cyberpunk descriptions
        const STARTING_SCENARIOS = [
            "INTRUSIÓN EN SISTEMA: El operario inicia la terminal detectando un ataque de denegación de servicio en el servidor de nóminas de Neo-Bandersnatch.",
            "FRACTURA DE DATOS: El operario se conecta y descubre una fuga de memorias de la IA_Monitor en el Sector 3.",
            "AUDITORIA CRÍTICA: Un correo de urgencia de la junta directiva de Neo-Bandersnatch exige auditar las transacciones de créditos del Sector 9.",
            "ACTIVACIÓN DE PROTOCOLO: Un implante de cromo corrupto en el brazo izquierdo del operario está enviando telemetría fantasma a una dirección IP de la resistencia.",
            "INFILTRACIÓN DIGITAL: Una facción rebelde de la resistencia UPDS ha inyectado un malware en el puerto subcutáneo del operario.",
            "FILTRACIÓN DE IA: Una subrutina autónoma de la IA_Monitor se ha independizado y está bloqueando el sector de investigación de Neo-Bandersnatch.",
            "ANOMALÍA GRAVITACIONAL: Sensores físicos reportan que la cabina de inmersión está experimentando micro-fluctuaciones magnéticas debido al sobrecalentamiento del mainframe.",
            "CONTRATO DE VIVISECCIÓN: Un documento confidencial revela que tu contrato de operario incluye una cláusula de donación forzosa de córneas cibernéticas.",
            "SECTOR FANTASMA: Se detecta una subred no mapeada llamada 'Sector_0' que está consumiendo el 40% del pulso de red del nodo central.",
            "AMENAZA DE REPLICA: Un clon sintético tuyo ha intentado registrarse con tu misma ID de cromo en la sucursal de Neo-Tokio.",
            "SOBRECARGA SINÁPTICA: Tus sensores neurales informan de un incremento del 200% en la temperatura de tu implante de interfaz de red.",
            "ARCHIVOS EXTRACORPORALES: Al iniciar sesión, se reproduce un audio de tu propia voz grabado hace dos horas, que no recuerdas haber grabado.",
            "PROTOCOLO DE PURGA: El sistema central ha marcado tu cabina de inmersión para desinfección preventiva por sospechas de contaminación viral.",
            "TRANSACCIÓN NEGRA: Descubres una transferencia no autorizada de 50,000 créditos desde la cuenta secreta del director de seguridad.",
            "ECOS DE RESISTENCIA: Mensajes de texto encriptados aparecen directamente en tu retina, instándote a sabotear el regulador de energía principal."
        ];
        // We always request a dynamic, completely original starting scenario from Gemini to guarantee uniqueness
        let chosenScenario = "GENERAR_NUEVO_ESCENARIO";
        // Retrieve past endings to pass to Gemini
        const pastEndings = await models_1.UnlockedEnding.find({ userId }).select('endingId title description -_id');
        // Generate initial avatar seed using user's username and selected gender
        const femaleSeeds = ['Aneka', 'Cali', 'Eden', 'Fiona', 'Grace', 'Harper', 'Iris', 'Jade', 'Kira', 'Luna'];
        const maleSeeds = ['Alex', 'Ben', 'Cole', 'Dylan', 'Eli', 'Felix', 'Gavin', 'Hugo', 'Ian', 'Jude'];
        const nonbinarySeeds = ['Cyborg', 'Glitch', 'Matrix', 'Vector', 'Pixel', 'Quantum', 'Cyber', 'Neon', 'Echo', 'Void'];
        let baseSeed = '';
        if (gender === 'femenino') {
            const idx = Math.floor(Math.random() * femaleSeeds.length);
            baseSeed = `${femaleSeeds[idx]}-${username}-${Date.now()}`;
        }
        else if (gender === 'masculino') {
            const idx = Math.floor(Math.random() * maleSeeds.length);
            baseSeed = `${maleSeeds[idx]}-${username}-${Date.now()}`;
        }
        else {
            const idx = Math.floor(Math.random() * nonbinarySeeds.length);
            baseSeed = `${nonbinarySeeds[idx]}-${username}-${Date.now()}`;
        }
        // Call Gemini to generate a cyberpunk avatar from scratch (or fallback to offline pool)
        const avatarUrl = await (0, gemini_service_1.generateAvatar)(gender || 'no-binario');
        // Create the avatar config with overlays
        const randomHex = Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
        const genderLetter = gender === 'femenino' ? 'F' : (gender === 'masculino' ? 'M' : 'X');
        const serialNumber = `NBS-${randomHex}-${genderLetter}`;
        const visorTints = ['none', 'neon-cyan', 'laser-red', 'toxic-green', 'solar-amber', 'void-purple'];
        const decalFrames = ['standard-grid', 'tactical-crosshair', 'diagnostic-scan', 'threat-warning'];
        const chosenConfig = {
            basePath: avatarUrl,
            hueShift: 0,
            visorTint: visorTints[Math.floor(Math.random() * visorTints.length)],
            decalFrame: decalFrames[Math.floor(Math.random() * decalFrames.length)],
            serialNumber
        };
        // Query Gemini for the initial narrative using the chosen starting scenario
        const gameResponse = await (0, gemini_service_1.queryGameMaster)({ sanity: 100, compliance: 50, credits: 100, netPulse: 100 }, [], // No history
        `START_SCENARIO: ${chosenScenario}. (Escenarios de inicio ya jugados y no repetibles: ${usedScenarios.join(', ')})`, false, // No antigravity loop on step 1
        pastEndings, usedScenarios);
        // Create a new session in MongoDB
        const session = new models_1.Session({
            userId,
            sanity: 100,
            compliance: 50,
            credits: 100,
            netPulse: 100,
            avatarUrl,
            status: 'ACTIVE',
            dynamicState: {
                avatarSeed: baseSeed,
                gender: gender || 'no-binario',
                avatarConfig: chosenConfig,
                implants: ['Ocular HUD Básica', 'Puerto de Red Subcutáneo'],
                lastNarrative: gameResponse, // Save initial narrative
                startingScenario: chosenScenario // Save the starting scenario to exclude it on future deaths!
            }
        });
        // If the starting scenario was generated dynamically by the GM, save its prefix
        if (chosenScenario === "GENERAR_NUEEN_ESCENARIO" || chosenScenario === "GENERAR_NUEVO_ESCENARIO") {
            const firstSentence = gameResponse.situationText.split(/[.!\n]/).filter(Boolean)[0] || "Escenario cuántico dinámico";
            session.dynamicState.startingScenario = `DINAMICO: ${firstSentence.trim()}`;
        }
        await session.save();
        // Save initial state as step 0 in logs
        const log = new models_1.DecisionLog({
            sessionId: session._id,
            stepNumber: 0,
            commandTyped: 'START_GAME',
            situationText: gameResponse.situationText,
            statsChanges: { sanity: 0, compliance: 0, credits: 0, netPulse: 0 }
        });
        await log.save();
        // SQL Server Audit Log
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, userId)
            .input('eventType', mssql_1.default.VarChar, 'INICIO_PARTIDA')
            .input('detail', mssql_1.default.VarChar, `Nueva partida iniciada. Sesión ID: ${session._id}`)
            .input('ipAddress', mssql_1.default.VarChar, ipAddress)
            .query(`
        INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
        VALUES (@usuarioId, @eventType, @detail, GETDATE(), @ipAddress)
      `);
        return res.status(201).json({
            sessionId: session._id,
            stats: {
                sanity: session.sanity,
                compliance: session.compliance,
                credits: session.credits,
                netPulse: session.netPulse
            },
            avatarUrl: session.avatarUrl,
            avatarConfig: session.dynamicState.avatarConfig,
            implants: session.dynamicState.implants,
            narrative: gameResponse
        });
    }
    catch (error) {
        console.error('[Game Controller] Start game error:', error);
        return res.status(500).json({ error: 'Error del servidor al iniciar partida', details: error.message });
    }
}
async function processCommand(req, res) {
    const userId = req.user?.userId;
    const { sessionId, command } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (userId === undefined || userId === null) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    if (!sessionId || !command) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: sessionId, command' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        // Find session in MongoDB
        const session = await models_1.Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Sesión de juego no encontrada' });
        }
        if (session.status === 'FINISHED') {
            return res.status(400).json({ error: 'Esta partida ya ha finalizado' });
        }
        // Block reset/reiniciar commands in active games to make decisions irreversible
        const lowerCmd = command.trim().toLowerCase();
        if ((lowerCmd === 'reset' || lowerCmd === 'reiniciar') && session.status === 'ACTIVE') {
            return res.status(400).json({ error: 'Las decisiones en Neo-Bandersnatch son irreversibles. No puedes reiniciar una simulación activa en curso. Completa tu destino.' });
        }
        // Retrieve previous decision logs for history
        const pastLogs = await models_1.DecisionLog.find({ sessionId })
            .sort({ stepNumber: 1 })
            .limit(10); // Keep past 10 logs for context
        const history = pastLogs.map(l => ({
            commandTyped: l.commandTyped,
            situationText: l.situationText
        }));
        const stepNumber = pastLogs.length > 0 ? Math.max(...pastLogs.map(l => l.stepNumber)) + 1 : 1;
        // Log the current user command first so the loop checker can evaluate it
        const commandLog = new models_1.DecisionLog({
            sessionId: session._id,
            stepNumber,
            commandTyped: command,
            situationText: 'Procesando entrada por el procesador del sistema...',
            statsChanges: { sanity: 0, compliance: 0, credits: 0, netPulse: 0 }
        });
        await commandLog.save();
        // Check if player is stuck in a loop
        const antigravityStatus = await (0, antigravity_service_1.detectAndProcessLoops)(session._id.toString());
        // Get current stats (after potential antigravity penalties)
        const currentStats = {
            sanity: session.sanity,
            compliance: session.compliance,
            credits: session.credits,
            netPulse: session.netPulse
        };
        // Fetch past endings to pass to Gemini
        const pastEndings = await models_1.UnlockedEnding.find({ userId }).select('endingId title description -_id');
        // Query Gemini
        const gameResponse = await (0, gemini_service_1.queryGameMaster)(currentStats, history, command, antigravityStatus, pastEndings);
        // Apply Gemini's stat updates to the session
        let totalSanityChange = 0;
        let totalComplianceChange = 0;
        let totalCreditsChange = 0;
        let totalNetPulseChange = 0;
        // Retrieve option selected to log its stat changes (if valid options existed)
        let matchedOption = gameResponse.options?.find(o => o.text.toLowerCase().includes(command.toLowerCase()) || command.includes(o.optionId.toString()));
        if (!matchedOption && gameResponse.options && gameResponse.options.length > 0) {
            const parsedId = parseInt(command);
            matchedOption = gameResponse.options.find(o => o.optionId === parsedId) || gameResponse.options[0];
        }
        if (matchedOption) {
            totalSanityChange = matchedOption.statsChanges.sanity || 0;
            totalComplianceChange = matchedOption.statsChanges.compliance || 0;
            totalCreditsChange = matchedOption.statsChanges.credits || 0;
            totalNetPulseChange = matchedOption.statsChanges.netPulse || 0;
        }
        // Apply updates (clamped between 0 and 100 where applicable)
        session.sanity = Math.max(0, Math.min(100, session.sanity + totalSanityChange));
        session.compliance = Math.max(0, Math.min(100, session.compliance + totalComplianceChange));
        session.credits = session.credits + totalCreditsChange;
        session.netPulse = Math.max(0, Math.min(100, session.netPulse + totalNetPulseChange));
        // Detect game over conditions
        let isGameOver = gameResponse.isGameOver || session.sanity <= 0 || session.netPulse <= 0;
        let endingSaved = null;
        if (isGameOver) {
            session.status = 'FINISHED';
            // Determine ending details
            let endingId = gameResponse.endingDetails?.endingId || 'generic_ending';
            let title = gameResponse.endingDetails?.title || 'Fin de la Simulación';
            let description = gameResponse.endingDetails?.description || 'Tu camino en Neo-Bandersnatch Corp ha concluido.';
            if (session.sanity <= 0) {
                endingId = 'sanity_collapse';
                title = 'Muerte Cerebral por Psicosis';
                description = 'Tu nivel de Sanidad cayó a cero. Tu mente se disolvió en el código corporativo.';
            }
            else if (session.netPulse <= 0) {
                endingId = 'net_purged';
                title = 'Desconexión Física Violenta';
                description = 'Tu Pulso de Red se agotó. Las fuerzas de seguridad de Neo-Bandersnatch Corp frieron tus implantes.';
            }
            // Permanent record of unlocked ending in MongoDB (relational link via numeric userId)
            try {
                const unlocked = new models_1.UnlockedEnding({
                    userId,
                    endingId,
                    title,
                    description
                });
                await unlocked.save();
                endingSaved = { endingId, title, description };
            }
            catch (err) {
                // Compound unique key may throw duplicate key error if already unlocked. That's fine!
                if (err.code === 11000) {
                    console.log(`[Game Controller] Ending '${endingId}' already unlocked for user ${userId}.`);
                    endingSaved = { endingId, title, description, alreadyUnlocked: true };
                }
                else {
                    console.error('[Game Controller] Saving ending error:', err);
                }
            }
            // SQL Server Audit Log for game completion
            await pool.request()
                .input('usuarioId', mssql_1.default.Int, userId)
                .input('eventType', mssql_1.default.VarChar, 'FIN_PARTIDA')
                .input('detail', mssql_1.default.VarChar, `Partida completada. Final: ${title} (${endingId}). Sesión ID: ${session._id}`)
                .input('ipAddress', mssql_1.default.VarChar, ipAddress)
                .query(`
          INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
          VALUES (@usuarioId, @eventType, @detail, GETDATE(), @ipAddress)
        `);
        }
        // Update the command log with the actual narrative outcome and stat changes
        commandLog.situationText = gameResponse.situationText;
        commandLog.statsChanges = {
            sanity: totalSanityChange,
            compliance: totalComplianceChange,
            credits: totalCreditsChange,
            netPulse: totalNetPulseChange
        };
        await commandLog.save();
        // Save last narrative state to dynamicState for resuming later
        session.dynamicState = {
            ...session.dynamicState,
            lastNarrative: {
                situationText: gameResponse.situationText,
                audioNarrativeText: gameResponse.audioNarrativeText,
                options: gameResponse.options || [],
                isGameOver,
                endingDetails: endingSaved || gameResponse.endingDetails
            }
        };
        await session.save();
        return res.status(200).json({
            sessionId: session._id,
            stats: {
                sanity: session.sanity,
                compliance: session.compliance,
                credits: session.credits,
                netPulse: session.netPulse
            },
            avatarUrl: session.avatarUrl,
            avatarConfig: session.dynamicState?.avatarConfig || null,
            implants: session.dynamicState?.implants || [],
            antigravityActive: antigravityStatus,
            narrative: {
                situationText: gameResponse.situationText,
                audioNarrativeText: gameResponse.audioNarrativeText,
                options: gameResponse.options || [],
                isGameOver,
                endingDetails: endingSaved || gameResponse.endingDetails
            }
        });
    }
    catch (error) {
        console.error('[Game Controller] Process command error:', error);
        return res.status(500).json({ error: 'Error al procesar el comando de juego', details: error.message });
    }
}
async function getUnlockedEndings(req, res) {
    const userId = req.user?.userId;
    if (userId === undefined || userId === null) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    try {
        const endings = await models_1.UnlockedEnding.find({ userId })
            .sort({ unlockedAt: -1 });
        return res.status(200).json(endings);
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al recuperar logros de finales', details: error.message });
    }
}
async function getActiveSession(req, res) {
    const userId = req.user?.userId;
    if (userId === undefined || userId === null) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    try {
        const activeSession = await models_1.Session.findOne({ userId, status: 'ACTIVE' });
        if (!activeSession) {
            return res.status(200).json({ hasActive: false });
        }
        return res.status(200).json({
            hasActive: true,
            sessionId: activeSession._id,
            stats: {
                sanity: activeSession.sanity,
                compliance: activeSession.compliance,
                credits: activeSession.credits,
                netPulse: activeSession.netPulse
            },
            avatarUrl: activeSession.avatarUrl,
            avatarConfig: activeSession.dynamicState?.avatarConfig || null,
            implants: activeSession.dynamicState?.implants || []
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al verificar partida activa', details: error.message });
    }
}
exports.SHOP_ITEMS = [
    {
        id: 'filtro_neural',
        name: 'Filtro Neural Antiviral',
        description: 'Purga procesos corruptos de tu red. Restaura Sanidad (+20) inmediatamente.',
        cost: 120,
        effect: { sanity: 20 }
    },
    {
        id: 'bypass_red',
        name: 'Bypass de Red UPDS',
        description: 'Bypassea controles corporativos de la red. Restaura Pulso de Red (+25).',
        cost: 150,
        effect: { netPulse: 25 }
    },
    {
        id: 'inyector_adrenalina',
        name: 'Inyector de Adrenalina',
        description: 'Inyección rápida de hormonas. Restaura Sanidad (+15) y Pulso de Red (+10).',
        cost: 90,
        effect: { sanity: 15, netPulse: 10 }
    },
    {
        id: 'cifrador_creditos',
        name: 'Cifrador de Cripto-Créditos',
        description: 'Desvía transacciones corporativas. Otorga Créditos (+50) a costa de Cumplimiento (-15).',
        cost: 40,
        effect: { credits: 50, compliance: -15 }
    },
    {
        id: 'optimizador_cromo',
        name: 'Optimizador de Cromo',
        description: 'Sincroniza y repara implantes. Restaura Sanidad (+10), Cumplimiento (+10) y Pulso de Red (+10).',
        cost: 180,
        effect: { sanity: 10, compliance: 10, netPulse: 10 }
    }
];
async function getShopItems(req, res) {
    return res.status(200).json(exports.SHOP_ITEMS);
}
async function buyItem(req, res) {
    const userId = req.user?.userId;
    const { sessionId, itemId } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (userId === undefined || userId === null) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    if (!sessionId || !itemId) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: sessionId, itemId' });
    }
    try {
        const pool = (0, mssql_service_1.getPool)();
        // Find the item in the catalog
        const item = exports.SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) {
            return res.status(404).json({ error: 'Implante no encontrado en el catálogo de la tienda.' });
        }
        // Find the session in MongoDB
        const session = await models_1.Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Sesión de juego no encontrada' });
        }
        if (session.status === 'FINISHED') {
            return res.status(400).json({ error: 'Esta partida ya ha finalizado' });
        }
        // Check credits
        if (session.credits < item.cost) {
            return res.status(400).json({ error: `Créditos insuficientes. Requieres ${item.cost} créditos.` });
        }
        // Deduct cost and apply effects
        session.credits -= item.cost;
        const sanityChange = item.effect.sanity || 0;
        const complianceChange = item.effect.compliance || 0;
        const creditsChange = item.effect.credits || 0;
        const netPulseChange = item.effect.netPulse || 0;
        session.sanity = Math.max(0, Math.min(100, session.sanity + sanityChange));
        session.compliance = Math.max(0, Math.min(100, session.compliance + complianceChange));
        session.credits += creditsChange;
        session.netPulse = Math.max(0, Math.min(100, session.netPulse + netPulseChange));
        // Add to implants in dynamicState
        if (!session.dynamicState) {
            session.dynamicState = {};
        }
        const currentImplants = session.dynamicState.implants || [];
        if (!currentImplants.includes(item.name)) {
            currentImplants.push(item.name);
        }
        session.dynamicState = {
            ...session.dynamicState,
            implants: currentImplants
        };
        // Save session
        await session.save();
        // Log the transaction in MongoDB DecisionLog
        const pastLogs = await models_1.DecisionLog.find({ sessionId });
        const stepNumber = pastLogs.length > 0 ? Math.max(...pastLogs.map(l => l.stepNumber)) + 1 : 1;
        const purchaseLog = new models_1.DecisionLog({
            sessionId: session._id,
            stepNumber,
            commandTyped: `COMPRA:${item.id.toUpperCase()}`,
            situationText: `[CONEXIÓN TIENDA] Compra e instalación exitosa del implante: ${item.name}. ${item.description}`,
            statsChanges: {
                sanity: sanityChange,
                compliance: complianceChange,
                credits: creditsChange - item.cost,
                netPulse: netPulseChange
            }
        });
        await purchaseLog.save();
        // SQL Server Session Audit Log
        await pool.request()
            .input('usuarioId', mssql_1.default.Int, userId)
            .input('eventType', mssql_1.default.VarChar, 'COMPRA_IMPLANTE')
            .input('detail', mssql_1.default.VarChar, `Comprado implante: ${item.name} (${item.id}) por ${item.cost} créditos. Sesión ID: ${session._id}`)
            .input('ipAddress', mssql_1.default.VarChar, ipAddress)
            .query(`
        INSERT INTO AuditoriaSesiones (UsuarioID, TipoEvento, Detalle, FechaEvento, DireccionIP)
        VALUES (@usuarioId, @eventType, @detail, GETDATE(), @ipAddress)
      `);
        return res.status(200).json({
            sessionId: session._id,
            stats: {
                sanity: session.sanity,
                compliance: session.compliance,
                credits: session.credits,
                netPulse: session.netPulse
            },
            avatarUrl: session.avatarUrl,
            avatarConfig: session.dynamicState?.avatarConfig || null,
            implants: session.dynamicState?.implants || [],
            message: `Implante ${item.name} instalado correctamente.`
        });
    }
    catch (error) {
        console.error('[Game Controller] Buy item error:', error);
        return res.status(500).json({ error: 'Error del servidor al procesar la compra', details: error.message });
    }
}
