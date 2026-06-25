import React from 'react';
import { Shield, Brain, CreditCard, Activity, Cpu } from 'lucide-react';

interface StatsPanelProps {
  stats: {
    sanity: number;
    compliance: number;
    credits: number;
    netPulse: number;
  };
  implants: string[];
  antigravityActive: boolean;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, implants, antigravityActive }) => {
  const isSanityLow = stats.sanity < 40;
  const isNetPulseLow = stats.netPulse < 35;

  return (
    <div className={`p-4 border-2 ${antigravityActive ? 'border-crt-red glow-border-red' : 'border-crt-green glow-border-green'} bg-crt-darkgreen/40 h-full flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-crt-green/30">
          <span className={`text-lg font-bold tracking-widest ${antigravityActive ? 'text-crt-red glow-red' : 'text-crt-green glow-green'}`}>
            {antigravityActive ? '⚠️ OPERARIO EN ENTROPÍA' : '📊 ESTADO DEL OPERARIO'}
          </span>
          <span className="text-xs text-crt-dim animate-pulseSlow">NODO-451</span>
        </div>

        {/* STATS LIST */}
        <div className="space-y-4">
          {/* SANITY */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4" /> SANIDAD
              </span>
              <span className={isSanityLow ? 'text-crt-red animate-pulse' : 'text-crt-green'}>
                {stats.sanity}%
              </span>
            </div>
            <div className="w-full bg-crt-darkgreen h-2 border border-crt-green/40 relative">
              <div 
                className={`h-full ${isSanityLow ? 'bg-crt-red' : 'bg-crt-green'} transition-all duration-500`}
                style={{ width: `${stats.sanity}%` }}
              />
            </div>
          </div>

          {/* NET PULSE */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" /> PULSO DE RED
              </span>
              <span className={isNetPulseLow ? 'text-crt-red animate-pulse' : 'text-crt-green'}>
                {stats.netPulse}%
              </span>
            </div>
            <div className="w-full bg-crt-darkgreen h-2 border border-crt-green/40 relative">
              <div 
                className={`h-full ${isNetPulseLow ? 'bg-crt-red' : 'bg-crt-green'} transition-all duration-500`}
                style={{ width: `${stats.netPulse}%` }}
              />
            </div>
          </div>

          {/* COMPLIANCE */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" /> CUMPLIMIENTO
              </span>
              <span>{stats.compliance}%</span>
            </div>
            <div className="w-full bg-crt-darkgreen h-2 border border-crt-green/40 relative">
              <div 
                className="h-full bg-crt-green transition-all duration-500"
                style={{ width: `${stats.compliance}%` }}
              />
            </div>
          </div>

          {/* CREDITS */}
          <div className="pt-2">
            <div className="flex justify-between items-center bg-crt-darkgreen/80 p-2 border border-crt-green/30 rounded">
              <span className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4" /> CRÉDITOS
              </span>
              <span className="text-crt-yellow glow-yellow font-bold text-lg">
                ₵ {stats.credits}
              </span>
            </div>
          </div>
        </div>

        {/* IMPLANTS / CYBERWARE */}
        <div className="mt-6">
          <div className="text-xs text-crt-dim uppercase tracking-wider mb-2 border-b border-crt-green/20 pb-1 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> Implantes Instalados
          </div>
          <ul className="space-y-1">
            {implants.map((imp, idx) => (
              <li key={idx} className="text-xs flex items-center gap-1.5 text-crt-green/80">
                <span className="text-crt-green">›</span> {imp}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FOOTER SYSTEM STATE */}
      <div className="mt-4 pt-3 border-t border-crt-green/20 text-center">
        {antigravityActive ? (
          <div className="bg-crt-redDim/30 text-crt-red border border-crt-red text-xs py-1.5 px-2 animate-pulse font-bold tracking-widest glow-red">
            ALERTA: ANTIGRAVEDAD ACTIVA
          </div>
        ) : isSanityLow || isNetPulseLow ? (
          <div className="bg-crt-redDim/20 text-crt-yellow border border-crt-yellow/50 text-xs py-1.5 px-2 animate-pulse">
            SISTEMA OPERATIVO INESTABLE
          </div>
        ) : (
          <div className="bg-crt-darkgreen/60 text-crt-dim border border-crt-green/20 text-xs py-1 px-2">
            CONEXIÓN ESTABLE SECURA
          </div>
        )}
      </div>
    </div>
  );
};
