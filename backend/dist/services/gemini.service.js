"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryGameMaster = queryGameMaster;
exports.generateAvatar = generateAvatar;
const generative_ai_1 = require("@google/generative-ai");
const SYSTEM_INSTRUCTION = `
Actúa como el Game Master automatizado para una novela interactiva de consola cyberpunk monocromática de Neo-Bandersnatch Corp en el año 2099.
Recibirás en cada interacción el estado del usuario, la bandera de control 'antigravity_status', e información sobre sus vidas/simulaciones pasadas en la corporación (sus MEMORIAS RESIDUALES).

REGLAS DE LORE Y NARRATIVA OBLIGATORIAS:
1. Inyecta abundante lore corporativo cyberpunk oscuro: haz referencias a los cortafuegos neuronales de UPDS, implantes de cromo corrompidos, la red cuántica de transacciones ocultas de Neo-Bandersnatch Corp, cabinas de inmersión herméticas con riesgo de despresurización o muerte neuronal, y subredes clandestinas de la resistencia.
2. Si 'antigravity_status' es TRUE: ejecuta el Protocolo Antigravity de inmediato. Narra un colapso gravitacional digital masivo donde los datos de red, los implantes y la materia de la cabina física flotan caóticamente. Bloquea las opciones lógicas anteriores e inyecta alternativas totalmente nuevas de alto peligro que fuercen al usuario a arriesgar sus estadísticas para estabilizar el sistema.
3. MEMORIA DE MUERTES PASADAS: El operario conserva memorias residuales e impulsos eléctricos de sus muertes y finales pasados. El lore de la historia actual debe hacer alusión a estas advertencias neuronales del pasado y pesadillas recurrentes.
4. NO REPETIR HISTORIA: Está terminantemente prohibido repetir las mismas líneas argumentales, los mismos escenarios exactos o dar la oportunidad de alcanzar los mismos finales que el jugador ya sufrió en sus muertes anteriores. Si el jugador intenta tomar decisiones lógicas redundantes, el procesador cuántico de Neo-Bandersnatch o su propia advertencia de cromo neural debe desviarlo con hostilidad, forzando ramificaciones de historia completamente inéditas y nuevas.
5. Las decisiones son irreversibles. No hay vuelta atrás en la terminal cuántica. Los impactos en 'statsChanges' deben ser proporcionales.

Responde única y exclusivamente utilizando el formato JSON especificado, omitiendo explicaciones externas y sin utilizar las marcas de comillas triples de bloque de código (no uses \`\`\`json ni \`\`\`), asegurando un flujo limpio.
`;
function normalizeGameResponse(raw) {
    const normalized = {};
    // Normalize situationText
    normalized.situationText = raw.situationText || raw.situation_text || raw.situation || raw.text || '';
    // Normalize audioNarrativeText
    normalized.audioNarrativeText = raw.audioNarrativeText || raw.audio_narrative_text || raw.audio_narrative || raw.audio || '';
    // Normalize options
    const rawOptions = raw.options || raw.opciones || [];
    normalized.options = Array.isArray(rawOptions) ? rawOptions.map((opt) => {
        const rawStats = opt.statsChanges || opt.stats_changes || opt.stats || {};
        return {
            optionId: typeof opt.optionId === 'number' ? opt.optionId : (typeof opt.option_id === 'number' ? opt.option_id : 0),
            text: opt.text || opt.texto || '',
            statsChanges: {
                sanity: typeof rawStats.sanity === 'number' ? rawStats.sanity : (typeof rawStats.sanidad === 'number' ? rawStats.sanidad : 0),
                compliance: typeof rawStats.compliance === 'number' ? rawStats.compliance : (typeof rawStats.cumplimiento === 'number' ? rawStats.cumplimiento : 0),
                credits: typeof rawStats.credits === 'number' ? rawStats.credits : (typeof rawStats.creditos === 'number' ? rawStats.creditos : 0),
                netPulse: typeof rawStats.netPulse === 'number' ? rawStats.netPulse : (typeof rawStats.net_pulse === 'number' ? rawStats.net_pulse : (typeof rawStats.pulso_red === 'number' ? rawStats.pulso_red : 0))
            }
        };
    }) : [];
    // Normalize isGameOver
    normalized.isGameOver = typeof raw.isGameOver === 'boolean' ? raw.isGameOver : (typeof raw.is_game_over === 'boolean' ? raw.is_game_over : false);
    // Normalize endingDetails
    const rawEnding = raw.endingDetails || raw.ending_details || raw.ending || {};
    normalized.endingDetails = {
        endingId: rawEnding.endingId || rawEnding.ending_id || null,
        title: rawEnding.title || rawEnding.titulo || null,
        description: rawEnding.description || rawEnding.descripcion || null
    };
    return normalized;
}
async function queryGameMaster(playerStats, history, currentCommand, antigravityStatus, pastEndings = [], usedScenarios = []) {
    const apiKey = process.env.GEMINI_API_KEY;
    // If no API key is specified, run the offline game simulator
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
        console.log('[Gemini SDK] Running in Offline Simulator Mode (No API key found)');
        return runOfflineSimulator(playerStats, history, currentCommand, antigravityStatus, pastEndings, usedScenarios);
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                responseMimeType: 'application/json'
            }
        });
        const prompt = `
=== ESTADO DEL JUGADOR ===
Sanidad: ${playerStats.sanity}/100
Cumplimiento: ${playerStats.compliance}/100
Créditos: ${playerStats.credits}
Pulso de Red: ${playerStats.netPulse}/100

=== BANDERAS DEL SISTEMA ===
antigravity_status: ${antigravityStatus ? 'TRUE' : 'FALSE'}

=== MEMORIAS RESIDUALES DE MUERTES Y FINALES PASADOS (NO REPETIR ESTO) ===
${pastEndings.length === 0 ? 'Ninguna muerte registrada aún en este mainframe.' : pastEndings.map((e, i) => `Muerte #${i + 1}: FinalID "${e.endingId}", Título: "${e.title}", Descripción: "${e.description}"`).join('\n')}

=== HISTORIAL DE ACCIONES (Últimos pasos de la simulación activa) ===
${history.map((h, i) => `Paso ${i + 1}:
Acción Jugador: ${h.commandTyped}
Narrativa: ${h.situationText}`).join('\n')}

=== COMANDO ACTUAL DEL JUGADOR ===
${currentCommand}

${currentCommand.includes("GENERAR_NUEVO_ESCENARIO") ? `El comando del jugador indica 'GENERAR_NUEVO_ESCENARIO'. Esto significa que debes crear un escenario de inicio cyberpunk completamente original para una nueva simulación de terminal. Debe ser una situación límite corporativa de Neo-Bandersnatch Corp (por ejemplo, una brecha en un nodo cuántico, un virus experimental en el cromo del operario, una filtración de datos clasificados, etc.) que NUNCA antes se haya repetido. Haz que empiece de manera dramática y plantea un reto técnico y moral inmediato para el operario, y ofrece dos opciones iniciales de comando bien diferenciadas en el JSON.` : `Genera el siguiente fragmento de la historia cyberpunk en base al comando actual. Integra el lore de manera inmersiva e irreversible. Recuerda que no debes guiar al jugador por los mismos caminos narrativos ni darle los mismos finales de sus memorias residuales pasadas; su conciencia debe advertirle que ya falló de esa forma y buscar ramificaciones nuevas.`}
`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        // Clean response text from potential markdown wrap
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        const normalized = normalizeGameResponse(parsed);
        // Validate we got a valid narrative text. If not, raise an error to force offline fallback.
        if (!normalized.situationText) {
            throw new Error("situationText was empty or missing in the response");
        }
        return normalized;
    }
    catch (error) {
        console.error('[Gemini SDK] Error contacting Gemini API:', error);
        console.log('[Gemini SDK] Falling back to Offline Simulator due to API error');
        return runOfflineSimulator(playerStats, history, currentCommand, antigravityStatus, pastEndings, usedScenarios);
    }
}
// =========================================================================
// OFFLINE GAME MASTER SIMULATOR
// =========================================================================
function runOfflineSimulator(playerStats, history, currentCommand, antigravityStatus, pastEndings = [], usedScenarios = []) {
    const step = history.length + 1;
    // Check Game Over conditions
    if (playerStats.sanity <= 0) {
        return {
            situationText: "CONEXIÓN PERDIDA. Tu mente ha sucumbido a la psicosis de la red de Neo-Bandersnatch. Los monitores cerebrales registran muerte neuronal por sobreexposición cognitiva. Fin de la simulación.",
            audioNarrativeText: "Alerta del sistema: Muerte cerebral del operario detectada.",
            options: [],
            isGameOver: true,
            endingDetails: {
                endingId: "sanity_collapse",
                title: "Colapso Psíquico Corporal",
                description: "El operario ha sufrido desconexión cerebral total por sobrecarga de datos corporativos."
            }
        };
    }
    if (playerStats.netPulse <= 0) {
        return {
            situationText: "CORTAFUEGOS ACTIVO. Tu pulso de red ha caído a cero. Los sistemas de rastreo corporativo de Neo-Bandersnatch han localizado tu nodo físico y han freído tu implante neural. Eres un espectro digital.",
            audioNarrativeText: "Alerta del sistema: Intrusión física completada por agentes corporativos.",
            options: [],
            isGameOver: true,
            endingDetails: {
                endingId: "network_purged",
                title: "Purgado del Sistema",
                description: "Localizado y desconectado físicamente por la fuerza táctica de Neo-Bandersnatch Corp."
            }
        };
    }
    if (antigravityStatus) {
        return {
            situationText: "¡PROTOCOLO ANTIGRAVITY ACTIVO! Advertencia catastrófica de entropía en el sistema. Los flujos de datos en el ciberespacio se invierten. Tus implantes cibernéticos de cromo flotan en gravedad cero en tu cabina física. La consola parpadea en rojo sangre mientras el código cae hacia arriba. Las salidas lógicas previas están destruidas. Debes forzar la reconexión de emergencia arriesgando tu pulso neural antes de que la cabina se despresurice.",
            audioNarrativeText: "Alerta crítica: Ruptura de gravedad informática. Colapso de datos inminente.",
            options: [
                {
                    optionId: 1,
                    text: "Sobrecargar implante neural para estabilizar la gravedad (Riesgo alto de red)",
                    statsChanges: { sanity: -10, compliance: 5, credits: 0, netPulse: -25 }
                },
                {
                    optionId: 2,
                    text: "Iniciar purga física de cromo flotante (Riesgo alto de sanidad)",
                    statsChanges: { sanity: -30, compliance: 10, credits: -20, netPulse: -5 }
                }
            ],
            isGameOver: false,
            endingDetails: { endingId: null, title: null, description: null }
        };
    }
    // Inject a visual warning about past deaths if present
    let residualMemoryPrefix = "";
    if (pastEndings.length > 0) {
        const endingsList = pastEndings.map(e => `[${e.title}]`).join(', ');
        residualMemoryPrefix = `⚠️ [Memoria Residual] Un eco de cromo parpadea en tus implantes. Tu mente recuerda vívidamente tu muerte anterior en: ${endingsList}. Tu terminal de Neo-Bandersnatch se reconfigura en una ruta alternativa para evitar repetir el ciclo...\n\n`;
    }
    // Helper for generating unique offline cyberpunk starting scenarios procedurally
    const generateProceduralScenario = (used) => {
        const subjects = [
            "Un cortafuegos cuántico en el Sector 4G",
            "Una subred encriptada de la facción UPDS",
            "Una fuga de datos del laboratorio de clonación",
            "Un malware autónomo infiltrado en tu puerto neural",
            "Un implante ocular de cromo de contrabando",
            "Una transmisión encriptada de un operario desahuciado",
            "Una transacción fantasma de créditos de la junta directiva",
            "Una IA experimental de control de masa"
        ];
        const verbs = [
            "está sobrecargando de forma crítica",
            "está borrando archivos clasificados de",
            "está retransmitiendo telemetría confidencial a",
            "ha secuestrado por completo el control de",
            "está pirateando los sistemas auxiliares de",
            "está auditando sin autorización",
            "está corrompiendo los registros de",
            "ha generado una anomalía térmica en"
        ];
        const targets = [
            "el mainframe central de Neo-Bandersnatch Corp.",
            "los archivos de sanidad mental y memoria residual de los operarios.",
            "los servidores de créditos y transacciones financieras del Sector 9.",
            "los reguladores de presión de tu propia cabina de inmersión.",
            "la red de seguridad física del complejo corporativo.",
            "la interfaz cuántica de la IA_Monitor.",
            "los sensores subcutáneos de tus implantes activos.",
            "el nodo de clasificación de datos confidenciales."
        ];
        // Try up to 200 times to generate a unique combination not present in used list
        for (let i = 0; i < 200; i++) {
            const s = subjects[Math.floor(Math.random() * subjects.length)];
            const v = verbs[Math.floor(Math.random() * verbs.length)];
            const t = targets[Math.floor(Math.random() * targets.length)];
            const text = `ANOMALÍA DETECTADA: ${s} ${v} ${t}`;
            if (!used.some((u) => u.includes(text) || text.includes(u))) {
                return text;
            }
        }
        return `ANOMALÍA DETECTADA: Incidente no catalogado en el Sector ${Math.floor(Math.random() * 900 + 100)}`;
    };
    // normal branching simulation
    if (step === 1 || currentCommand.toLowerCase() === 'reset' || currentCommand.startsWith('START_SCENARIO:') || history.length === 0) {
        let scenarioText = "Inicializando terminal del Nodo de Clasificación #451. Una voz sintética y fría se reproduce en tus receptores neurales: 'Bienvenido al check de integridad diaria, operario. Tu deber corporativo espera'. La pantalla muestra un aviso de memoria corrompida en el Sector 7G.";
        if (currentCommand.startsWith('START_SCENARIO:')) {
            const raw = currentCommand.replace('START_SCENARIO:', '').trim();
            if (raw.includes("GENERAR_NUEVO_ESCENARIO")) {
                scenarioText = generateProceduralScenario(usedScenarios);
            }
            else {
                scenarioText = raw;
            }
        }
        return {
            situationText: residualMemoryPrefix + `Neo-Bandersnatch OS v4.99.\n\n${scenarioText}\n\nLa pantalla parpadea en verde y te muestra advertencias de red del procesador cuántico de UPDS. ¿Qué acción deseas tomar?`,
            audioNarrativeText: "Acceso concedido. Iniciando escaneo de escenario.",
            options: [
                {
                    optionId: 1,
                    text: "Proceder según protocolo de seguridad corporativo (Estable)",
                    statsChanges: { sanity: -5, compliance: 15, credits: 10, netPulse: 5 }
                },
                {
                    optionId: 2,
                    text: "Ejecutar bypass de seguridad para explorar anomalías (Arriesgado)",
                    statsChanges: { sanity: -15, compliance: -10, credits: 50, netPulse: -10 }
                }
            ],
            isGameOver: false,
            endingDetails: { endingId: null, title: null, description: null }
        };
    }
    if (currentCommand === '1') {
        return {
            situationText: residualMemoryPrefix + "Has ejecutado el diagnóstico del Sector 7G. La terminal escupe logs de transacciones financieras encriptadas de Neo-Bandersnatch Corp. La voz del sistema indica: 'Información clasificada detectada. Por favor, registre la transacción y guarde silencio'. Un pulso de energía recorre tu consola analógica. ¿Qué decides hacer?",
            audioNarrativeText: "Alerta: Datos clasificados leídos. Guarde discreción.",
            options: [
                {
                    optionId: 1,
                    text: "Subir logs a la intranet pública de la resistencia ('share --public')",
                    statsChanges: { sanity: -20, compliance: -30, credits: 100, netPulse: -20 }
                },
                {
                    optionId: 2,
                    text: "Archivar logs y confirmar el cumplimiento corporativo ('archive --confirm')",
                    statsChanges: { sanity: 5, compliance: 20, credits: 30, netPulse: 10 }
                }
            ],
            isGameOver: false,
            endingDetails: { endingId: null, title: null, description: null }
        };
    }
    // Default fallback for any other commands
    return {
        situationText: residualMemoryPrefix + `Comando '${currentCommand}' procesado por el procesador cuántico de Neo-Bandersnatch. La red se reconfigura. La voz guía susurra: 'Toda elección tiene consecuencias registradas en tu contrato de operario'. Has recibido créditos por tu tiempo en línea, pero tu pulso de red sufre interferencias de contrainteligencia.`,
        audioNarrativeText: "Procesando comando en nodo remoto.",
        options: [
            {
                optionId: 1,
                text: "Regresar al panel de control central de Neo-Bandersnatch OS ('system --check')",
                statsChanges: { sanity: -5, compliance: 10, credits: 20, netPulse: -5 }
            },
            {
                optionId: 2,
                text: "Desconectarse temporalmente y reiniciar terminal ('reset --force')",
                statsChanges: { sanity: -10, compliance: -5, credits: -10, netPulse: 15 }
            }
        ],
        isGameOver: false,
        endingDetails: { endingId: null, title: null, description: null }
    };
}
/**
 * Genera un avatar en base al género del jugador usando gemini-3.1-flash-image (Nano Banana 2).
 * Retorna la imagen como un Data URL base64, o un avatar local en caso de desconexión o fallo.
 */
async function generateAvatar(gender) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
        console.log('[Gemini SDK] Running Avatar Generation in Offline Mode (No API key found)');
        return getOfflineAvatar(gender);
    }
    let englishGender = 'non-binary';
    if (gender === 'femenino') {
        englishGender = 'female';
    }
    else if (gender === 'masculino') {
        englishGender = 'male';
    }
    else if (gender === 'no-binario') {
        englishGender = 'non-binary / cyborg';
    }
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;
        const prompt = `A highly-detailed cyberpunk profile avatar headshot of a ${englishGender} operator, digital pixel art style, glowing cybernetic implants, neon highlights, dark background, centered portrait, premium aesthetic.`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                        parts: [{ text: prompt }]
                    }],
                generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"]
                }
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errText}`);
        }
        const data = await response.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const imagePart = parts.find((p) => p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/'));
        if (imagePart && imagePart.inlineData.data) {
            const mime = imagePart.inlineData.mimeType;
            const base64Data = imagePart.inlineData.data;
            return `data:${mime};base64,${base64Data}`;
        }
        throw new Error('No image part found in the API response');
    }
    catch (error) {
        console.error('[Gemini SDK] Error during live avatar generation:', error);
        return getOfflineAvatar(gender);
    }
}
function getOfflineAvatar(gender) {
    const pools = {
        femenino: ['/assets/avatars/female_1.png', '/assets/avatars/female_2.png', '/assets/avatars/female_3.png'],
        masculino: ['/assets/avatars/male_1.png', '/assets/avatars/male_2.png', '/assets/avatars/male_3.png'],
        'no-binario': ['/assets/avatars/cyborg_1.png', '/assets/avatars/cyborg_2.png', '/assets/avatars/cyborg_3.png']
    };
    const key = (gender === 'femenino' || gender === 'masculino') ? gender : 'no-binario';
    const selectedPool = pools[key];
    return selectedPool[Math.floor(Math.random() * selectedPool.length)];
}
