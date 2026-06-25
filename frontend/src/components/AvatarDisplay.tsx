import React, { useState } from 'react';

interface AvatarDisplayProps {
  avatarUrl: string;
  avatarConfig?: {
    basePath: string;
    hueShift: number;
    visorTint: string;
    decalFrame: string;
    serialNumber: string;
  } | null;
  antigravityActive: boolean;
  sanity: number;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ avatarUrl, avatarConfig, antigravityActive, sanity }) => {
  const isSanityLow = sanity < 40;
  
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalize coordinates around the center (-0.5 to 0.5)
    const normalizedX = (x / rect.width) - 0.5;
    const normalizedY = (y / rect.height) - 0.5;
    
    // Calculate rotation angles (max 25 degrees for noticeable tilt)
    const rotateY = normalizedX * 25; 
    const rotateX = -normalizedY * 25;
    
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };



  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`p-4 border-2 ${
        antigravityActive 
          ? 'border-crt-red glow-border-red' 
          : 'border-crt-green glow-border-green'
      } bg-crt-darkgreen/40 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[200px] transition-all duration-300 select-none cursor-crosshair`}
    >
      <style>{`
        @keyframes eyeBlink {
          0%, 90%, 94%, 98%, 100% { opacity: 1; }
          92%, 96% { opacity: 0.15; }
        }
        @keyframes eyePulse {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes scanlineMove {
          0% { transform: translateY(-70px); }
          100% { transform: translateY(70px); }
        }
        @keyframes floatSway {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(1.5deg); }
        }
        .eye-blink-anim {
          animation: eyeBlink 5s infinite;
        }
        .eye-pulse-anim {
          animation: eyePulse 1.5s infinite ease-in-out;
        }
        .hud-scanner-bar {
          animation: scanlineMove 4s infinite linear;
        }
        .avatar-float-sway {
          animation: floatSway 4.5s infinite ease-in-out;
        }
      `}</style>
      
      {/* Background grid matrix lines for scanning effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,102,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,102,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

      {/* Grid scanline indicator */}
      <div className="absolute top-2 left-2 text-[10px] text-crt-dim tracking-widest uppercase">
        {antigravityActive 
          ? '📡 GRAVEDAD_0_ACTIVA' 
          : avatarConfig?.serialNumber 
            ? `👤 OPERARIO ID: ${avatarConfig.serialNumber}` 
            : '👤 RENDIMIENTO_HOLOGRAMA'}
      </div>

      {/* CRT scanline glow on the avatar itself */}
      <div 
        className={`w-32 h-32 relative flex items-center justify-center rounded border border-crt-green/20 bg-black/60 overflow-hidden transition-transform duration-150 ease-out ${
          antigravityActive ? 'crt-shake' : ''
        } ${!isHovered ? 'avatar-float-sway' : ''}`}
        style={isHovered ? {
          transform: `perspective(300px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
        } : undefined}
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt="Avatar del Operario" 
            className={`w-28 h-28 object-contain transition-all duration-300 pointer-events-none ${
              antigravityActive ? 'scale-110 brightness-110 contrast-125' : ''
            }`}
            style={{
              filter: `
                ${avatarConfig?.hueShift ? `hue-rotate(${avatarConfig.hueShift}deg)` : ''}
                ${isSanityLow ? ' hue-rotate(90deg) saturate(2)' : ''}
              `.trim() || undefined
            }}
          />
        ) : (
          <div className="text-xs text-crt-dim animate-pulse">CARGANDO RENDER...</div>
        )}



        {/* Decal Overlays */}
        {avatarConfig?.decalFrame === 'standard-grid' && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-crt-green/60" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-crt-green/60" />
            <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-crt-green/60" />
            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-crt-green/60" />
          </div>
        )}

        {avatarConfig?.decalFrame === 'tactical-crosshair' && (
          <div className="absolute inset-3 border border-crt-green/10 pointer-events-none z-20">
            <div className="absolute top-1/2 left-0 w-2.5 h-[1px] bg-crt-green/45" />
            <div className="absolute top-1/2 right-0 w-2.5 h-[1px] bg-crt-green/45" />
            <div className="absolute top-0 left-1/2 h-2.5 w-[1px] bg-crt-green/45" />
            <div className="absolute bottom-0 left-1/2 h-2.5 w-[1px] bg-crt-green/45" />
          </div>
        )}

        {avatarConfig?.decalFrame === 'diagnostic-scan' && (
          <div className="absolute inset-0 flex flex-col justify-between p-1 font-mono text-[7px] text-crt-green/60 tracking-tighter select-none pointer-events-none z-20">
            <div className="flex justify-between w-full">
              <span>SYS_SYNC: 99.8%</span>
              <span>CHIP_T: 34.2C</span>
            </div>
            <div className="flex justify-between w-full">
              <span>NEURAL_LOAD: LOW</span>
              <span>SEC_VER: CLASSIFIED</span>
            </div>
          </div>
        )}

        {avatarConfig?.decalFrame === 'threat-warning' && (
          <div className="absolute inset-0 border border-crt-red/30 pointer-events-none z-20 animate-pulse bg-crt-red/5">
            <div className="absolute top-1 right-1 text-[6px] text-crt-red font-bold">⚠️ ALERTA_CROMO</div>
            <div className="absolute bottom-1 left-1 text-[6px] text-crt-red font-bold">MUTACIÓN: DETECTADA</div>
          </div>
        )}

        {/* Horizontal scanline bar sweeps down */}
        <div className={`absolute left-0 right-0 h-[1.5px] ${
          antigravityActive ? 'bg-crt-red/50 glow-red' : 'bg-crt-green/40 glow-green'
        } hud-scanner-bar pointer-events-none z-10`} />

        {/* CRT Scanline stripes overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[size:100%_4px] pointer-events-none z-30" />
      </div>

      {/* Status Indicators */}
      <div className="mt-3 text-center z-10 select-none">
        <span className={`text-xs font-bold px-2 py-0.5 border ${
          antigravityActive 
            ? 'text-crt-red border-crt-red animate-pulse bg-crt-red/10' 
            : isSanityLow 
              ? 'text-crt-yellow border-crt-yellow animate-pulse bg-crt-yellow/5' 
              : 'text-crt-green border-crt-green/30 bg-crt-green/5'
        }`}>
          {antigravityActive 
            ? 'REGISTRO DE MASA: FLOTANTE' 
            : isSanityLow 
              ? 'MUTACIÓN FÍSICA INESTABLE' 
              : 'INTEGRIDAD CELULAR: 100%'}
        </span>
      </div>
    </div>
  );
};
