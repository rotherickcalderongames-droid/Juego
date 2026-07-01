import React, { useEffect, useState } from 'react';
import { CreditCard, Cpu, ShoppingCart, Loader2 } from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: {
    sanity?: number;
    compliance?: number;
    credits?: number;
    netPulse?: number;
  };
}

interface ShopPanelProps {
  sessionId: string | null;
  token: string | null;
  playerCredits: number;
  installedImplants: string[];
  onBuyItem: (itemId: string) => Promise<void>;
  isLoading: boolean;
}

export const ShopPanel: React.FC<ShopPanelProps> = ({
  token,
  playerCredits,
  installedImplants,
  onBuyItem,
  isLoading: globalLoading
}) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // Fetch shop items from backend
  useEffect(() => {
    if (!token) return;
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const res = await fetch('http://localhost:5002/api/game/shop/items', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error('Error fetching shop items:', err);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [token]);

  const handleBuy = async (itemId: string) => {
    if (globalLoading || buyingId) return;
    setBuyingId(itemId);
    try {
      await onBuyItem(itemId);
    } catch (err) {
      console.error(err);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="p-4 border-2 border-crt-green bg-crt-darkgreen/40 h-full flex flex-col justify-between glow-border-green">
      <div>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-crt-green/30">
          <span className="text-lg font-bold tracking-widest text-crt-green glow-green flex items-center gap-1.5">
            <ShoppingCart className="w-5 h-5" /> CIBER-TIENDA
          </span>
          <span className="text-xs text-crt-dim">NODO-COMPRA</span>
        </div>

        {/* Current Balance */}
        <div className="mb-4 flex justify-between items-center bg-crt-darkgreen/80 p-2 border border-crt-green/30 rounded">
          <span className="flex items-center gap-2 text-xs font-bold tracking-wider">
            <CreditCard className="w-4 h-4 text-crt-green" /> SALDO DISPONIBLE
          </span>
          <span className="text-crt-yellow glow-yellow font-bold text-base">
            ₵ {playerCredits}
          </span>
        </div>

        {/* Catalog List */}
        {loadingItems ? (
          <div className="flex flex-col items-center justify-center py-8 text-crt-dim text-xs gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-crt-green" />
            Cargando catálogo cuántico...
          </div>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {items.map((item) => {
              const alreadyHas = installedImplants.includes(item.name);
              const canAfford = playerCredits >= item.cost;
              const isBuyingThis = buyingId === item.id;

              return (
                <div 
                  key={item.id} 
                  className={`p-2.5 border text-xs relative transition-all rounded ${
                    alreadyHas 
                      ? 'border-crt-green/30 bg-black/40 opacity-70' 
                      : canAfford 
                        ? 'border-crt-green/40 hover:border-crt-green bg-black/20' 
                        : 'border-crt-red/30 bg-black/10 opacity-60'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-crt-green flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> {item.name}
                    </span>
                    <span className={canAfford ? 'text-crt-yellow glow-yellow' : 'text-crt-red'}>
                      ₵ {item.cost}
                    </span>
                  </div>

                  {/* Item Description */}
                  <p className="text-[10px] text-crt-dim leading-tight mb-2">
                    {item.description}
                  </p>

                  {/* Item Effects HUD */}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-crt-green/80 uppercase font-mono mb-2">
                    {item.effect.sanity && (
                      <span className="bg-crt-green/10 px-1 border border-crt-green/10">
                        Sanidad +{item.effect.sanity}
                      </span>
                    )}
                    {item.effect.netPulse && (
                      <span className="bg-crt-green/10 px-1 border border-crt-green/10">
                        Red +{item.effect.netPulse}
                      </span>
                    )}
                    {item.effect.compliance && (
                      <span className={`${item.effect.compliance > 0 ? 'bg-crt-green/10' : 'bg-crt-redDim/10 text-crt-red'} px-1 border ${item.effect.compliance > 0 ? 'border-crt-green/10' : 'border-crt-red/10'}`}>
                        Cumplimiento {item.effect.compliance > 0 ? `+${item.effect.compliance}` : item.effect.compliance}
                      </span>
                    )}
                    {item.effect.credits && (
                      <span className="bg-crt-yellow/10 text-crt-yellow px-1 border border-crt-yellow/10">
                        Créditos +{item.effect.credits}
                      </span>
                    )}
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => handleBuy(item.id)}
                    disabled={alreadyHas || !canAfford || globalLoading || !!buyingId}
                    className={`w-full py-1 text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      alreadyHas 
                        ? 'border-crt-green/20 text-crt-green/40 bg-transparent cursor-not-allowed' 
                        : isBuyingThis
                          ? 'border-crt-yellow text-crt-yellow bg-crt-yellow/10 animate-pulse'
                          : canAfford 
                            ? 'border-crt-green bg-crt-green/10 hover:bg-crt-green hover:text-black text-crt-green cursor-pointer' 
                            : 'border-crt-red text-crt-red bg-transparent cursor-not-allowed'
                    }`}
                  >
                    {alreadyHas 
                      ? 'Instalado' 
                      : isBuyingThis
                        ? 'Instalando...'
                        : canAfford 
                          ? 'Comprar e Instalar' 
                          : 'Saldo Insuficiente'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-crt-green/20 text-[10px] text-crt-dim text-center">
        * Las mejoras sinápticas se activan de forma inmediata en tu mainframe neural.
      </div>
    </div>
  );
};
