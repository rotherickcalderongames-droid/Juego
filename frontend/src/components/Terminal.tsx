import React, { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';

interface Option {
  optionId: number;
  text: string;
  statsChanges: {
    sanity: number;
    compliance: number;
    credits: number;
    netPulse: number;
  };
}

interface Narrative {
  situationText: string;
  audioNarrativeText: string;
  options: Option[];
  isGameOver: boolean;
  endingDetails: {
    endingId: string | null;
    title: string | null;
    description: string | null;
  } | null;
}

interface TerminalProps {
  narrative: Narrative;
  onSubmitCommand: (cmd: string) => Promise<void>;
  isLoading: boolean;
  onLogout: () => void;
}

interface LogLine {
  type: 'system' | 'user' | 'error' | 'success' | 'alert';
  text: string;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  narrative, 
  onSubmitCommand, 
  isLoading,
  onLogout
}) => {
  const [command, setCommand] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<LogLine[]>([]);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const { speak } = useSpeech();

  // Typewriter effect logic
  useEffect(() => {
    if (!narrative.situationText) return;

    setDisplayText('');
    setIsTyping(true);
    let index = 0;
    const text = narrative.situationText;
    
    // Play synthetic voice alert
    if (narrative.audioNarrativeText) {
      speak(narrative.audioNarrativeText);
    }

    const timer = setInterval(() => {
      setDisplayText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 12); // Speed of character generation (12ms)

    return () => {
      clearInterval(timer);
    };
  }, [narrative.situationText, speak]);

  // Scroll to bottom whenever display text or logs change
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayText, consoleLogs, isLoading]);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCmd = command.trim();
    if (!cleanCmd) return;

    // Append user input to logs
    setConsoleLogs(prev => [...prev, { type: 'user', text: `Neo-Bandersnatch-OS> ${cleanCmd}` }]);
    setCommand('');

    // Handle local help/logout commands before sending to game logic
    const cmdLower = cleanCmd.toLowerCase();
    
    if ((cmdLower === 'reset' || cmdLower === 'reiniciar') && !narrative.isGameOver) {
      setConsoleLogs(prev => [
        ...prev,
        { type: 'error', text: '❌ [System] ERROR: Las decisiones son irreversibles. No puedes reiniciar una simulación activa en curso. Completa tu destino.' }
      ]);
      speak("Error. Las decisiones son irreversibles. No puedes reiniciar la simulación activa.");
      return;
    }

    if (cmdLower === 'clear') {
      setConsoleLogs([]);
      return;
    }
    if (cmdLower === 'logout') {
      onLogout();
      return;
    }
    if (cmdLower === 'help') {
      setConsoleLogs(prev => [
        ...prev,
        { type: 'system', text: '=== CÓDIGOS DE COMANDO DE NEO-BANDERSNATCH ===' },
        { type: 'system', text: '1 o 2          : Selecciona una de las opciones del prompt narrativo' },
        { type: 'system', text: 'reset           : Fuerza el reinicio cuántico de la sesión' },
        { type: 'system', text: 'save / guardar  : Resguarda de forma inmutable el progreso actual' },
        { type: 'system', text: 'clear           : Limpia la memoria de esta pantalla de terminal' },
        { type: 'system', text: 'logout          : Cierra sesión de seguridad en el mainframe' }
      ]);
      return;
    }
    if (cmdLower === 'save' || cmdLower === 'guardar') {
      setConsoleLogs(prev => [
        ...prev,
        { type: 'system', text: '💾 [System] RESGUARDO CUÁNTICO COMPLETADO.' },
        { type: 'system', text: 'Tu progreso actual (Estadísticas, Implantes y Narrativa) ha sido guardado de forma persistente en MongoDB.' },
        { type: 'system', text: 'Puedes salir del mainframe de forma segura. Tu partida estará lista al reanudar sesión.' }
      ]);
      return;
    }

    // Call submit handler
    try {
      await onSubmitCommand(cleanCmd);
    } catch (error: any) {
      setConsoleLogs(prev => [...prev, { type: 'error', text: `ERROR DEL MAINFRAME: ${error.message || 'Conexión interrumpida'}` }]);
    }
  };

  const selectOptionDirectly = (optionId: number) => {
    if (isLoading || isTyping) return;
    setCommand(optionId.toString());
  };

  return (
    <div className="flex flex-col h-[500px] border-2 border-crt-green bg-black/90 p-4 relative overflow-hidden glow-border-green crt-screen">
      
      {/* Background glowing line scanner */}
      <div className="scanline-animation" />

      {/* Terminal Header */}
      <div className="flex justify-between items-center text-xs text-crt-dim border-b border-crt-green/30 pb-2 mb-2">
        <span>NEO-BANDERSNATCH-OS TERMINAL SECURE LINK v4.99</span>
        <span>BAJO SUPERVISIÓN ANTIGRAVITY ACTIVE</span>
      </div>

      {/* Terminal Body (Scrollable Output) */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-sm leading-relaxed scrollbar-thin">
        {/* Past console logs */}
        {consoleLogs.map((log, index) => (
          <div 
            key={index} 
            className={
              log.type === 'user' 
                ? 'text-crt-yellow glow-yellow' 
                : log.type === 'error' 
                  ? 'text-crt-red glow-red font-bold' 
                  : 'text-crt-dim'
            }
          >
            {log.text}
          </div>
        ))}

        {/* Current Typewritten Narrative */}
        <div className="whitespace-pre-wrap text-crt-green">
          {displayText}
          {isTyping && <span className="cursor-blink" />}
        </div>

        {/* Option prompt list (only show when typing is done and not game over) */}
        {!isTyping && !narrative.isGameOver && narrative.options && narrative.options.length > 0 && (
          <div className="space-y-2 mt-4 border-t border-crt-green/10 pt-3">
            <div className="text-xs text-crt-dim uppercase tracking-wider">Opciones lógicas de respuesta:</div>
            {narrative.options.map((opt) => (
              <button
                key={opt.optionId}
                onClick={() => selectOptionDirectly(opt.optionId)}
                className="w-full text-left p-2 border border-crt-green/20 bg-crt-darkgreen/10 hover:bg-crt-green/10 hover:border-crt-green/60 text-sm transition-all flex items-start gap-2 focus:outline-none focus:ring-1 focus:ring-crt-green"
                disabled={isLoading}
              >
                <span className="text-crt-yellow font-bold">[{opt.optionId}]</span>
                <span>{opt.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Game Over Epilogue UI */}
        {!isTyping && narrative.isGameOver && narrative.endingDetails && (
          <div className="mt-4 p-4 border border-crt-red bg-crt-redDim/20 rounded space-y-2 crt-shake">
            <div className="text-crt-red font-extrabold tracking-widest text-lg glow-red animate-pulse">
              ❌ CONEXIÓN TERMINAL INTERRUMPIDA
            </div>
            <div className="text-sm font-bold text-white">
              FINAL ALCANZADO: {narrative.endingDetails.title}
            </div>
            <p className="text-xs text-crt-green/90 italic">
              {narrative.endingDetails.description}
            </p>
            <div className="pt-2">
              <span className="text-xs text-crt-dim">Escribe 'reset' para iniciar una nueva partida en el mainframe.</span>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="text-crt-dim italic flex items-center gap-2 animate-pulse">
            <span>▋</span> ENVIANDO PETICIÓN AL PROCESADOR CUÁNTICO...
          </div>
        )}

        {/* Ref node to auto-scroll */}
        <div ref={consoleEndRef} />
      </div>

      {/* Terminal Input Form */}
      <form onSubmit={handleCommandSubmit} className="mt-3 pt-3 border-t border-crt-green/30 flex items-center">
        <label htmlFor="cli-input" className="text-crt-yellow font-bold mr-2 select-none">
          Neo-Bandersnatch-OS&gt;
        </label>
        <input
          id="cli-input"
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-crt-green caret-crt-green font-mono focus:ring-0 focus:outline-none"
          placeholder="Escribe un comando (1, 2, 3, 4, reset, help)..."
          autoComplete="off"
          disabled={isLoading || isTyping}
          autoFocus
        />
      </form>
    </div>
  );
};
