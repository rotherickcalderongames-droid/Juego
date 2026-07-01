import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `
Actúa como el Game Master automatizado para una novela interactiva de consola cyberpunk monocromática de Neo-Bandersnatch Corp en el año 2099.
Recibirás en cada interacción el estado del usuario, la bandera de control 'antigravity_status', e información sobre sus vidas/simulaciones pasadas en la corporación (sus MEMORIAS RESIDUALES).

REGLAS DE LORE Y NARRATIVA OBLIGATORIAS:
1. Inyecta abundante lore corporativo cyberpunk oscuro: haz referencias a los cortafuegos neuronales de UPDS, implantes de cromo corrompidos, la red cuántica de transacciones ocultas de Neo-Bandersnatch Corp, cabinas de inmersión herméticas con riesgo de despresurización o muerte neuronal, y subredes clandestinas de la resistencia.
2. Si 'antigravity_status' es TRUE: ejecuta el Protocolo Antigravity de inmediato. Narra un colapso gravitacional digital masivo donde los datos de red, los implantes y la materia de la cabina física flotan caóticamente. Bloquea las opciones lógicas anteriores e inyecta alternativas totalmente nuevas de alto peligro que fuercen al usuario a arriesgar sus estadísticas para estabilizar el sistema. Ofrece exactamente 3 opciones lógicas de emergencia.
3. MEMORIA DE MUERTES PASADAS: El operario conserva memorias residuales e impulsos eléctricos de sus muertes y finales pasados. El lore de la historia actual debe hacer alusión a estas advertencias neuronales del pasado y pesadillas recurrentes.
4. NO REPETIR HISTORIA E HISTORIA ÚNICA DINÁMICA: Está terminantemente prohibido repetir las mismas líneas argumentales, los mismos escenarios exactos o dar la oportunidad de alcanzar los mismos finales que el jugador ya sufrió en sus muertes anteriores. Cada respuesta debe cambiar dinámicamente el rumbo de la historia de manera totalmente aleatoria y creativa. El Game Master debe generar activamente giros de trama imprevistos, nuevos peligros corporativos y dilemas éticos/técnicos basados en el comando del usuario.
5. Las decisiones son irreversibles. No hay vuelta atrás en la terminal cuántica. Los impactos en 'statsChanges' deben ser proporcionales.
6. GENERACIÓN DINÁMICA DE OPCIONES (MÍNIMO 3 U OBLIGATORIAS 3 A 4): Debes generar obligatoriamente entre 3 y 4 opciones de comando lógicas y bien diferenciadas en cada turno (no te limites a 2). Cada opción debe representar una acción cyberpunk coherente y tener cambios significativos e impactantes en las estadísticas del jugador.
7. REGLA DE FORMATO DE NÚMROS JSON: En el objeto 'statsChanges', los números positivos NO DEBEN llevar el signo más (+). Por ejemplo, usa 15 en lugar de +15. Los números negativos sí deben llevar el signo menos (-).
8. REGLAS DE CONCISIÓN EXTREMA Y VELOCIDAD (HISTORIAS CORTAS):
   - La narrativa en 'situationText' debe ser breve, directa y contundente, al estilo de una terminal de consola. Máximo 2 párrafos muy cortos (total entre 50 y 80 palabras). No te extiendas con rodeos.
   - El resumen auditivo en 'audioNarrativeText' debe ser una única oración muy corta de máximo 10 palabras.
   - Cada texto de opción en 'text' debe ser extremadamente corto y conciso (máximo 6 a 8 palabras).

FORMATO JSON OBLIGATORIO:
Debes responder única y exclusivamente utilizando un objeto JSON válido con la estructura especificada en el esquema de respuesta.
`;

const gameResponseSchema = {
  type: FunctionDeclarationSchemaType.OBJECT,
  properties: {
    situationText: {
      type: FunctionDeclarationSchemaType.STRING,
      description: "Narrativa breve y contundente en español de la situación actual. Máximo 2 párrafos y 80 palabras.",
      properties: {}
    },
    audioNarrativeText: {
      type: FunctionDeclarationSchemaType.STRING,
      description: "Resumen auditivo en español de una sola frase corta. Máximo 10 palabras.",
      properties: {}
    },
    options: {
      type: FunctionDeclarationSchemaType.ARRAY,
      description: "Lista de 3 a 4 opciones de comando variadas.",
      properties: {},
      items: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
          optionId: {
            type: FunctionDeclarationSchemaType.INTEGER,
            description: "ID secuencial, empezando en 1.",
            properties: {}
          },
          text: {
            type: FunctionDeclarationSchemaType.STRING,
            description: "Texto de la opción en español. Muy conciso, máximo 6-8 palabras.",
            properties: {}
          },
          statsChanges: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              sanity: { type: FunctionDeclarationSchemaType.INTEGER, properties: {} },
              compliance: { type: FunctionDeclarationSchemaType.INTEGER, properties: {} },
              credits: { type: FunctionDeclarationSchemaType.INTEGER, properties: {} },
              netPulse: { type: FunctionDeclarationSchemaType.INTEGER, properties: {} }
            },
            required: ["sanity", "compliance", "credits", "netPulse"]
          }
        },
        required: ["optionId", "text", "statsChanges"]
      }
    },
    isGameOver: {
      type: FunctionDeclarationSchemaType.BOOLEAN,
      description: "Indica si el juego termina.",
      properties: {}
    },
    endingDetails: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        endingId: { type: FunctionDeclarationSchemaType.STRING, description: "ID del final o null si continúa.", properties: {} },
        title: { type: FunctionDeclarationSchemaType.STRING, description: "Título del final o null si continúa.", properties: {} },
        description: { type: FunctionDeclarationSchemaType.STRING, description: "Descripción del final o null si continúa.", properties: {} }
      },
      required: ["endingId", "title", "description"]
    }
  },
  required: ["situationText", "audioNarrativeText", "options", "isGameOver", "endingDetails"]
};

export interface IGameResponse {
  situationText: string;
  audioNarrativeText: string;
  options: {
    optionId: number;
    text: string;
    statsChanges: {
      sanity: number;
      compliance: number;
      credits: number;
      netPulse: number;
    };
  }[];
  isGameOver: boolean;
  endingDetails: {
    endingId: string | null;
    title: string | null;
    description: string | null;
  };
}

function findKeyRecursively(obj: any, keyNames: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  
  // First check keys at the current level
  for (const key of Object.keys(obj)) {
    if (keyNames.includes(key) && obj[key] !== undefined) {
      return obj[key];
    }
  }
  
  // Then check children recursively
  for (const key of Object.keys(obj)) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findKeyRecursively(obj[key], keyNames);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function unwrapResponse(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const keys = Object.keys(obj);
  if (keys.length === 1 && typeof obj[keys[0]] === 'object' && obj[keys[0]] !== null && !Array.isArray(obj[keys[0]])) {
    const subObj = obj[keys[0]];
    const subKeys = Object.keys(subObj);
    if (subKeys.some(k => ['situationText', 'situation_text', 'situation', 'narrative', 'story', 'options', 'opciones'].includes(k))) {
      console.log(`[Gemini SDK] Unwrapped response from key: ${keys[0]}`);
      return subObj;
    }
  }
  return obj;
}

function getTopLevelKey(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined) return obj[k];
  }
  return undefined;
}

function normalizeGameResponse(raw: any): IGameResponse {
  const unwrapped = unwrapResponse(raw);
  const normalized: Partial<IGameResponse> = {};

  // Extract top-level keys without recursion first
  normalized.situationText = getTopLevelKey(unwrapped, ['situationText', 'situation_text', 'situation', 'narrative', 'story', 'text']) || '';
  normalized.audioNarrativeText = getTopLevelKey(unwrapped, ['audioNarrativeText', 'audio_narrative_text', 'audio_narrative', 'audio', 'audioText', 'voiceText']) || '';
  
  const isGameOverVal = getTopLevelKey(unwrapped, ['isGameOver', 'is_game_over', 'gameOver', 'ended', 'finalizado', 'terminado']);
  normalized.isGameOver = isGameOverVal !== undefined ? !!isGameOverVal : false;

  // Last-resort fallback to recursive check if situationText is missing
  if (!normalized.situationText || normalized.situationText.trim() === '') {
    console.warn('[Gemini SDK] situationText was empty after top-level extraction. Trying recursive fallback...');
    const recursiveText = findKeyRecursively(unwrapped, ['situationText', 'situation_text', 'situation', 'narrative', 'story']);
    if (recursiveText && typeof recursiveText === 'string') {
      normalized.situationText = recursiveText;
    }
  }

  const rawOptions = getTopLevelKey(unwrapped, ['options', 'opciones', 'choices', 'answers']) || [];
  normalized.options = Array.isArray(rawOptions) ? rawOptions.map((opt: any, index: number) => {
    const rawStats = getTopLevelKey(opt, ['statsChanges', 'stats_changes', 'stats', 'changes', 'effects']) || {};
    const optText = getTopLevelKey(opt, ['text', 'texto', 'description', 'desc']) || '';
    
    const sanity = getTopLevelKey(rawStats, ['sanity', 'sanidad', 'sanityChange', 'sanity_change']) ?? 0;
    const compliance = getTopLevelKey(rawStats, ['compliance', 'cumplimiento', 'complianceChange', 'compliance_change']) ?? 0;
    const credits = getTopLevelKey(rawStats, ['credits', 'creditos', 'creditsChange', 'credits_change']) ?? 0;
    const netPulse = getTopLevelKey(rawStats, ['netPulse', 'net_pulse', 'networkPulse', 'network_pulse', 'pulso_red', 'pulso']) ?? 0;

    return {
      optionId: index + 1, // Auto-assign sequential IDs as requested
      text: typeof optText === 'string' ? optText : String(optText || ''),
      statsChanges: {
        sanity: typeof sanity === 'number' ? sanity : parseInt(String(sanity)) || 0,
        compliance: typeof compliance === 'number' ? compliance : parseInt(String(compliance)) || 0,
        credits: typeof credits === 'number' ? credits : parseInt(String(credits)) || 0,
        netPulse: typeof netPulse === 'number' ? netPulse : parseInt(String(netPulse)) || 0
      }
    };
  }) : [];

  const rawEnding = getTopLevelKey(unwrapped, ['endingDetails', 'ending_details', 'ending', 'end', 'final']) || {};
  normalized.endingDetails = {
    endingId: getTopLevelKey(rawEnding, ['endingId', 'ending_id', 'id']) || null,
    title: getTopLevelKey(rawEnding, ['title', 'titulo']) || null,
    description: getTopLevelKey(rawEnding, ['description', 'descripcion', 'desc']) || null
  };

  return normalized as IGameResponse;
}

export async function queryGameMaster(
  playerStats: { sanity: number; compliance: number; credits: number; netPulse: number },
  history: { commandTyped: string; situationText: string }[],
  currentCommand: string,
  antigravityStatus: boolean,
  pastEndings: { endingId: string; title: string; description: string }[] = [],
  usedScenarios: string[] = []
): Promise<IGameResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key is specified, run the offline game simulator
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    console.log('[Gemini SDK] Running in Offline Simulator Mode (No API key found)');
    return runOfflineSimulator(playerStats, history, currentCommand, antigravityStatus, pastEndings, usedScenarios);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-flash-latest'
    ];

    let result = null;
    let lastError = null;

    const prompt = `
=== ESTADO DEL JUGADOR ===
Sanidad: ${playerStats.sanity}/100
Cumplimiento: ${playerStats.compliance}/100
Créditos: ${playerStats.credits}
Pulso de Red: ${playerStats.netPulse}/100

=== BANDERAS DEL SISTEMA ===
antigravity_status: ${antigravityStatus ? 'TRUE' : 'FALSE'}

=== MEMORIAS RESIDUALES DE MUERTES Y FINALES PASADOS (NO REPETIR ESTO) ===
${pastEndings.length === 0 ? 'Ninguna muerte registrada aún en este mainframe.' : pastEndings.map((e, i) => `Muerte #${i+1}: FinalID "${e.endingId}", Título: "${e.title}", Descripción: "${e.description}"`).join('\n')}

=== HISTORIAL DE ACCIONES (Últimos pasos de la simulación activa) ===
${history.map((h, i) => `Paso ${i+1}:
Acción Jugador: ${h.commandTyped}
Narrativa: ${h.situationText}`).join('\n')}

=== COMANDO ACTUAL DEL JUGADOR ===
${currentCommand}

${currentCommand.includes("GENERAR_NUEVO_ESCENARIO") ? `El comando del jugador indica 'GENERAR_NUEVO_ESCENARIO'. Esto significa que debes crear un escenario de inicio cyberpunk completamente original, dinámico y aleatorio para una nueva simulación de terminal. Debe ser una situación límite corporativa de Neo-Bandersnatch Corp (por ejemplo, una brecha en un nodo cuántico, un virus experimental en el cromo del operario, una filtración de datos clasificados, etc.) que NUNCA antes se haya repetido. Haz que empiece de manera dramática y plantea un reto técnico y moral inmediato para el operario, y ofrece entre 3 y 4 opciones iniciales de comando bien diferenciadas en el JSON.` : `Genera el siguiente fragmento de la historia cyberpunk en base al comando actual de manera completamente dinámica, aleatoria y original. Integra el lore de manera inmersiva e irreversible. Recuerda que no debes guiar al jugador por los mismos caminos narrativos ni darle los mismos finales de sus memorias residuales pasadas; su conciencia debe advertirle que ya falló de esa forma y buscar ramificaciones nuevas. Ofrece en el JSON entre 3 y 4 opciones lógicas, variadas y bien diferenciadas para que el jugador elija.`}
`;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_INSTRUCTION,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: gameResponseSchema,
            temperature: 1.05,
            maxOutputTokens: 350
          }
        });
        
        result = await model.generateContent(prompt);
        console.log(`[Gemini SDK] Successfully queried model: ${modelName}`);
        break; // break the loop on success!
      } catch (err: any) {
        console.warn(`[Gemini SDK] Model ${modelName} failed: ${err.message}`);
        lastError = err;
      }
    }

    if (!result) {
      throw lastError || new Error("All candidate models failed to generate content");
    }
    
    const responseText = result.response.text();
    console.log('[Gemini SDK] Raw response text:', responseText);
    
    // Clean response text from potential markdown wrap
    let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Pre-processing to repair common LLM JSON syntax errors:
    // 1. Remove leading plus signs on positive numbers (e.g., ": +15" -> ": 15")
    cleanedText = cleanedText.replace(/(:\s*)\+(\d+(\.\d+)?)/g, '$1$2');
    
    // 2. Remove trailing commas before closing braces/brackets (e.g., "a: 1," -> "a: 1")
    cleanedText = cleanedText.replace(/,(\s*[\]}])/g, '$1');

    console.log('[Gemini SDK] Cleaned text before JSON parse:', cleanedText);

    const parsed = JSON.parse(cleanedText);
    console.log('[Gemini SDK] Parsed JSON:', JSON.stringify(parsed, null, 2));

    const normalized = normalizeGameResponse(parsed);
    console.log('[Gemini SDK] Normalized response:', JSON.stringify(normalized, null, 2));

    // Validate we got a valid narrative text. If not, raise an error to force offline fallback.
    if (!normalized.situationText) {
      throw new Error("situationText was empty or missing in the response");
    }

    return normalized;
  } catch (error) {
    console.error('[Gemini SDK] Error contacting Gemini API:', error);
    console.log('[Gemini SDK] Falling back to Offline Simulator due to API error');
    return runOfflineSimulator(playerStats, history, currentCommand, antigravityStatus, pastEndings, usedScenarios);
  }
}

// =========================================================================
// OFFLINE GAME MASTER SIMULATOR
// =========================================================================
function runOfflineSimulator(
  playerStats: { sanity: number; compliance: number; credits: number; netPulse: number },
  history: { commandTyped: string; situationText: string }[],
  currentCommand: string,
  antigravityStatus: boolean,
  pastEndings: { endingId: string; title: string; description: string }[] = [],
  usedScenarios: string[] = []
): IGameResponse {
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
        },
        {
          optionId: 3,
          text: "Hackear el giróscopo del mainframe para reordenar la gravedad (Riesgo medio global)",
          statsChanges: { sanity: -15, compliance: -10, credits: 10, netPulse: -15 }
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
  const generateProceduralScenario = (used: string[]): string => {
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
      if (!used.some((u: string) => u.includes(text) || text.includes(u))) {
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
      } else {
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
        },
        {
          optionId: 3,
          text: "Hackear cortafuegos neuronales para desviar telemetría clandestina (Ilegal)",
          statsChanges: { sanity: -10, compliance: -20, credits: 70, netPulse: -5 }
        }
      ],
      isGameOver: false,
      endingDetails: { endingId: null, title: null, description: null }
    };
  }

  // Procedural generator for step >= 2 to guarantee a unique, randomized offline story flow
  const actionsList = [
    "Has accedido al registro encriptado. Un pulso electromagnético sacude tu cabina.",
    "El mainframe responde con latencia crítica. Se detectan anomalías en tus implantes de cromo.",
    "Un agente encubierto de la resistencia inyecta instrucciones personalizadas en tu retina.",
    "La IA_Monitor de Neo-Bandersnatch inicia una auditoría en caliente sobre tu nodo.",
    "El flujo sináptico de tu cerebro se calibra con la subred no autorizada Sector_0."
  ];

  const outcomesList = [
    "Un cortafuegos local se ha cerrado, forzando una desviación de energía.",
    "Los créditos del sistema empiezan a fluctuar. Tienes 10 segundos para estabilizarlos.",
    "Un zumbido ensordecedor indica una anomalía de gravedad digital inminente.",
    "Se ha revelado una transacción oculta con tu nombre registrado como cómplice.",
    "El regulador de presión del casco neural se ha desajustado ligeramente."
  ];

  const actionText = actionsList[Math.floor(Math.random() * actionsList.length)];
  const outcomeText = outcomesList[Math.floor(Math.random() * outcomesList.length)];

  return {
    situationText: residualMemoryPrefix + 
      `Comando '${currentCommand}' ejecutado. ${actionText} ${outcomeText} La voz guía advierte: 'Cada elección es un nuevo contrato'. ¿Cómo procedes?`,
    audioNarrativeText: "Procesando respuesta en nodo remoto. Reconfigurando opciones.",
    options: [
      {
        optionId: 1,
        text: "Ejecutar purga forzada del búfer de memoria (Bajo riesgo)",
        statsChanges: { sanity: -5, compliance: 10, credits: 20, netPulse: -5 }
      },
      {
        optionId: 2,
        text: "Desconectarse de emergencia y enfriar implante (Recupera pulso de red)",
        statsChanges: { sanity: -10, compliance: -5, credits: -10, netPulse: 15 }
      },
      {
        optionId: 3,
        text: "Saturar cortafuegos y robar créditos corporativos (Riesgo alto de cumplimiento)",
        statsChanges: { sanity: -15, compliance: -30, credits: 100, netPulse: -15 }
      },
      {
        optionId: 4,
        text: "Iniciar simulación recursiva para engañar al monitor (Riesgo alto de sanidad)",
        statsChanges: { sanity: -25, compliance: 10, credits: 40, netPulse: -10 }
      }
    ],
    isGameOver: false,
    endingDetails: { endingId: null, title: null, description: null }
  };
}

/**
 * Pseudo-random generator based on seed string (Mulberry32)
 */
function createRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return function() {
    h = (h + 0x9e3779b9) | 0;
    let z = h;
    z ^= z >>> 16;
    z = Math.imul(z, 0x21f0aa7b);
    z ^= z >>> 15;
    z = Math.imul(z, 0x735a2d97);
    z ^= z >>> 15;
    return (z >>> 0) / 4294967296;
  };
}

/**
 * Generates a completely unique and unrepeatable cyberpunk vector avatar dynamically.
 */
export function generateProceduralAvatarSVG(gender: string, seed: string): string {
  const rand = createRandom(seed);
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const randChoice = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

  // Cyberpunk Color Palettes
  const palettes = [
    { primary: '#39ff14', secondary: '#005500', glow: 'rgba(57, 255, 20, 0.4)' },  // Neon Green
    { primary: '#00e1ff', secondary: '#004c66', glow: 'rgba(0, 225, 255, 0.4)' }, // Neon Cyan
    { primary: '#ff003c', secondary: '#660012', glow: 'rgba(255, 0, 60, 0.4)' },  // Laser Red
    { primary: '#ffaa00', secondary: '#664400', glow: 'rgba(255, 170, 0, 0.4)' }, // Warn Amber
    { primary: '#bd00ff', secondary: '#4a0066', glow: 'rgba(189, 0, 255, 0.4)' }  // Void Purple
  ];

  const colors = randChoice(palettes);

  // Background circuits details
  const bgLines: string[] = [];
  for (let i = 0; i < 4; i++) {
    const x1 = randInt(5, 95);
    const y1 = randInt(5, 95);
    const x2 = x1 + randChoice([-15, 15]);
    const y2 = y1 + randChoice([-15, 15]);
    bgLines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.primary}" stroke-width="0.5" opacity="0.3" stroke-dasharray="2,2"/>`);
  }

  // Draw face / helmet
  const headWidth = randInt(40, 52);
  const headHeight = randInt(45, 58);
  const headX = 50 - headWidth / 2;
  const headY = 48 - headHeight / 2;
  const headCornerRadius = randChoice([2, 5, 8, 12, 16]);

  // visor / eyes
  const eyeType = randChoice(['visor', 'double-lens', 'ocular-hud', 'cyborg-split']);
  let eyeHtml = '';
  if (eyeType === 'visor') {
    const visorW = headWidth - randInt(6, 12);
    const visorH = randInt(8, 14);
    const visorX = 50 - visorW / 2;
    const visorY = headY + headHeight * 0.3;
    eyeHtml = `<rect x="${visorX}" y="${visorY}" width="${visorW}" height="${visorH}" fill="#111" stroke="${colors.primary}" stroke-width="2" rx="2"/>
               <line x1="${visorX + 2}" y1="${visorY + visorH/2}" x2="${visorX + visorW - 2}" y2="${visorY + visorH/2}" stroke="${colors.primary}" stroke-width="1" opacity="0.8"/>`;
  } else if (eyeType === 'double-lens') {
    const lensRadius = randInt(4, 6);
    const eyeSpacing = randInt(12, 16);
    const eyeY = headY + headHeight * 0.35;
    eyeHtml = `
      <circle cx="${50 - eyeSpacing/2}" cy="${eyeY}" r="${lensRadius}" fill="#0a0a0a" stroke="${colors.primary}" stroke-width="2"/>
      <circle cx="${50 - eyeSpacing/2}" cy="${eyeY}" r="${lensRadius - 2}" fill="${colors.primary}" opacity="0.8"/>
      <circle cx="${50 + eyeSpacing/2}" cy="${eyeY}" r="${lensRadius}" fill="#0a0a0a" stroke="${colors.primary}" stroke-width="2"/>
      <circle cx="${50 + eyeSpacing/2}" cy="${eyeY}" r="${lensRadius - 2}" fill="${colors.primary}" opacity="0.8"/>
    `;
  } else if (eyeType === 'ocular-hud') {
    const eyeY = headY + headHeight * 0.35;
    eyeHtml = `
      <circle cx="${42}" cy="${eyeY}" r="3" fill="${colors.primary}"/>
      <circle cx="${58}" cy="${eyeY}" r="6" fill="#111" stroke="${colors.primary}" stroke-width="1.5"/>
      <circle cx="${58}" cy="${eyeY}" r="2" fill="${colors.primary}"/>
      <line x1="${50}" x2="${66}" y1="${eyeY}" y2="${eyeY}" stroke="${colors.primary}" stroke-width="0.5"/>
      <line x1="${58}" x2="${58}" y1="${eyeY - 8}" y2="${eyeY + 8}" stroke="${colors.primary}" stroke-width="0.5"/>
    `;
  } else {
    const eyeY = headY + headHeight * 0.35;
    eyeHtml = `
      <circle cx="${42}" cy="${eyeY}" r="4" fill="#000" stroke="${colors.primary}" stroke-width="2"/>
      <rect x="${52}" y="${eyeY - 5}" width="${12}" height="${10}" fill="#000" stroke="${colors.primary}" stroke-width="2"/>
      <circle cx="${58}" cy="${eyeY}" r="2" fill="${colors.primary}"/>
    `;
  }

  // Mouth / Tech jaw
  const mouthType = randChoice(['respirator', 'voice-grill', 'tech-plate', 'minimal']);
  let mouthHtml = '';
  const mouthY = headY + headHeight * 0.7;
  if (mouthType === 'respirator') {
    mouthHtml = `
      <polygon points="${50 - 9},${mouthY} ${50 + 9},${mouthY} ${50 + 5},${mouthY + 10} ${50 - 5},${mouthY + 10}" fill="#151515" stroke="${colors.primary}" stroke-width="1.5"/>
      <line x1="${50}" y1="${mouthY + 2}" x2="${50}" y2="${mouthY + 8}" stroke="${colors.primary}" stroke-width="1"/>
      <line x1="${50-3}" y1="${mouthY + 3}" x2="${50-3}" y2="${mouthY + 7}" stroke="${colors.primary}" stroke-width="1"/>
      <line x1="${50+3}" y1="${mouthY + 3}" x2="${50+3}" y2="${mouthY + 7}" stroke="${colors.primary}" stroke-width="1"/>
    `;
  } else if (mouthType === 'voice-grill') {
    mouthHtml = `
      <rect x="${40}" y="${mouthY}" width="20" height="5" fill="#000" stroke="${colors.primary}" stroke-width="1"/>
      <line x1="${44}" y1="${mouthY}" x2="${44}" y2="${mouthY+5}" stroke="${colors.primary}" stroke-width="1"/>
      <line x1="${47}" y1="${mouthY}" x2="${47}" y2="${mouthY+5}" stroke="${colors.primary}" stroke-width="1"/>
      <line x1="${50}" y1="${mouthY}" x2="${50}" y2="${mouthY+5}" stroke="${colors.primary}" stroke-width="1"/>
      <line x1="${53}" y1="${mouthY}" x2="${53}" y2="${mouthY+5}" stroke="${colors.primary}" stroke-width="1"/>
      <line x1="${56}" y1="${mouthY}" x2="${56}" y2="${mouthY+5}" stroke="${colors.primary}" stroke-width="1"/>
    `;
  } else if (mouthType === 'tech-plate') {
    mouthHtml = `
      <rect x="${42}" y="${mouthY - 2}" width="16" height="7" rx="2" fill="#000" stroke="${colors.primary}" stroke-width="1.2"/>
      <circle cx="50" cy="${mouthY + 1.5}" r="1" fill="${colors.primary}"/>
    `;
  } else {
    mouthHtml = `
      <line x1="44" y1="${mouthY + 1}" x2="56" y2="${mouthY + 1}" stroke="${colors.primary}" stroke-width="2"/>
    `;
  }

  // Ear/antenna equipment
  const earType = randChoice(['antenna', 'nodes', 'cooling-pipes', 'none']);
  let earsHtml = '';
  if (earType === 'antenna') {
    earsHtml = `
      <line x1="${headX}" y1="${headY + headHeight*0.4}" x2="${headX - 5}" y2="${headY + headHeight*0.2}" stroke="${colors.primary}" stroke-width="1.5"/>
      <circle cx="${headX - 5}" cy="${headY + headHeight*0.2}" r="1.5" fill="${colors.primary}"/>
      <line x1="${headX + headWidth}" y1="${headY + headHeight*0.4}" x2="${headX + headWidth + 5}" y2="${headY + headHeight*0.2}" stroke="${colors.primary}" stroke-width="1.5"/>
      <circle cx="${headX + headWidth + 5}" cy="${headY + headHeight*0.2}" r="1.5" fill="${colors.primary}"/>
    `;
  } else if (earType === 'nodes') {
    earsHtml = `
      <rect x="${headX - 2}" y="${headY + headHeight*0.3}" width="2" height="10" fill="${colors.primary}" rx="1"/>
      <rect x="${headX + headWidth}" y="${headY + headHeight*0.3}" width="2" height="10" fill="${colors.primary}" rx="1"/>
    `;
  } else if (earType === 'cooling-pipes') {
    earsHtml = `
      <path d="M ${headX} ${headY + headHeight*0.5} Q ${headX-6} ${headY + headHeight*0.7} 50 88" fill="none" stroke="${colors.primary}" stroke-width="1"/>
      <path d="M ${headX + headWidth} ${headY + headHeight*0.5} Q ${headX + headWidth + 6} ${headY + headHeight*0.7} 50 88" fill="none" stroke="${colors.primary}" stroke-width="1"/>
    `;
  }

  // Tech details / Circuit patterns on face
  const detailType = randChoice(['circuits', 'warning-symbol', 'none']);
  let detailsHtml = '';
  if (detailType === 'circuits') {
    detailsHtml = `
      <path d="M ${headX + 5} ${headY + 8} H ${headX + headWidth - 5} V ${headY + 14}" fill="none" stroke="${colors.primary}" stroke-width="0.8" opacity="0.6"/>
      <circle cx="${headX + 5}" cy="${headY + 8}" r="1" fill="${colors.primary}"/>
      <circle cx="${headX + headWidth - 5}" cy="${headY + 14}" r="1" fill="${colors.primary}"/>
    `;
  } else if (detailType === 'warning-symbol') {
    detailsHtml = `
      <polygon points="${50},${headY+3} ${50-3},${headY+8} ${50+3},${headY+8}" fill="none" stroke="${colors.primary}" stroke-width="0.8"/>
      <line x1="50" y1="${headY+4}" x2="50" y2="${headY+6}" stroke="${colors.primary}" stroke-width="0.5"/>
    `;
  }

  // Neck and shoulders
  const neckW = randInt(12, 16);
  const neckH = 12;
  const neckX = 50 - neckW / 2;
  const neckY = headY + headHeight - 2;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <radialGradient id="grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#000" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill="#000" />
      <circle cx="50" cy="50" r="45" fill="url(#grad)" />

      ${bgLines.join('\n')}

      <g filter="url(#glow)">
        <!-- Neck -->
        <rect x="${neckX}" y="${neckY}" width="${neckW}" height="${neckH}" fill="#080808" stroke="${colors.primary}" stroke-width="1.2"/>
        <line x1="${50}" y1="${neckY}" x2="${50}" y2="${neckY + neckH}" stroke="${colors.primary}" stroke-width="0.8" opacity="0.6"/>

        <!-- Shoulders / Cyber Armor -->
        <path d="M 12 95 L 26 80 H 74 L 88 95 Z" fill="#0c0c0c" stroke="${colors.primary}" stroke-width="1.8" />
        <line x1="26" y1="80" x2="20" y2="95" stroke="${colors.primary}" stroke-width="1" />
        <line x1="74" y1="80" x2="80" y2="95" stroke="${colors.primary}" stroke-width="1" />

        <!-- Head / Helmet -->
        <rect x="${headX}" y="${headY}" width="${headWidth}" height="${headHeight}" rx="${headCornerRadius}" fill="#050505" stroke="${colors.primary}" stroke-width="2" />

        <!-- Ears/Antennas -->
        ${earsHtml}

        <!-- Face Details -->
        ${detailsHtml}

        <!-- Eyes/Visor -->
        ${eyeHtml}

        <!-- Mouth -->
        ${mouthHtml}
      </g>
    </svg>
  `;

  const base64 = Buffer.from(svg.trim()).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Genera un avatar en base al género del jugador usando gemini-2.5-flash-image.
 * Falls back to the procedural SVG avatar generator on connection or quota failure.
 */
export async function generateAvatar(gender: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    console.log('[Gemini SDK] Running Avatar Generation in Offline Mode (No API key found)');
    return getOfflineAvatar(gender);
  }

  let englishGender = 'non-binary';
  if (gender === 'femenino') {
    englishGender = 'female';
  } else if (gender === 'masculino') {
    englishGender = 'male';
  } else if (gender === 'no-binario') {
    englishGender = 'non-binary / cyborg';
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
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

    const data: any = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/'));

    if (imagePart && imagePart.inlineData.data) {
      const mime = imagePart.inlineData.mimeType;
      const base64Data = imagePart.inlineData.data;
      return `data:${mime};base64,${base64Data}`;
    }

    throw new Error('No image part found in the API response');
  } catch (error) {
    console.error('[Gemini SDK] Error during live avatar generation (using procedural fallback):', error);
    return getOfflineAvatar(gender);
  }
}

function getOfflineAvatar(gender: string): string {
  let englishGender = 'non-binary';
  if (gender === 'femenino') {
    englishGender = 'female';
  } else if (gender === 'masculino') {
    englishGender = 'male';
  } else if (gender === 'no-binario') {
    englishGender = 'non-binary / cyborg';
  }

  const seed = Math.floor(Math.random() * 100000000);
  
  // Randomly select style details to enhance variety
  const styles = [
    'digital pixel art style, glowing cybernetic implants, neon highlights, dark background, centered portrait, premium aesthetic.',
    'retro sci-fi illustrations style, cybernetic eye, neon wires, synthwave color palette, centered headshot.',
    'detailed cyberpunk character design, glowing neon visor, holographic overlay, matrix grid background.',
    'high-tech netrunner profile, skull cyberware, holographic HUD, centered portrait, dark neon purple lighting.'
  ];
  const chosenStyle = styles[Math.floor(Math.random() * styles.length)];
  const prompt = `A highly-detailed cyberpunk profile avatar headshot of a ${englishGender} operator, ${chosenStyle}`;
  
  return `https://image.pollinations.ai/p/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`;
}





