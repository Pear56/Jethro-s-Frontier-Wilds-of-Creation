
import React from 'react';
import { InventorySlot, PlayerStats, ItemType, BlockType } from '../../types';
import { Heart, Zap, Thermometer, Droplets, Menu, Crosshair } from 'lucide-react';
import { COLORS } from '../../constants';

interface HUDProps {
  stats: PlayerStats;
  inventory: InventorySlot[];
  selectedSlot: number;
  onSelectSlot: (index: number) => void;
  time: number;
  onOpenMenu: () => void;
}

const HUD: React.FC<HUDProps> = ({ stats, inventory, selectedSlot, onSelectSlot, time, onOpenMenu }) => {
  
  const timePercent = (time / 2400) * 100;
  const isNight = time > 1400 || time < 400;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
      
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80">
         <Crosshair size={24} strokeWidth={1.5} />
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2 bg-black/40 p-2 rounded-lg backdrop-blur-sm pointer-events-auto border border-white/10">
           {/* Vitals */}
           <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-current" />
              <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${stats.health}%` }}></div>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500 fill-current" />
              <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${stats.hunger}%` }}></div>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400 fill-current" />
              <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${stats.thirst}%` }}></div>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-400" />
              <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-blue-600 via-green-500 to-red-500"></div>
                <div className="absolute top-0 bottom-0 w-1 bg-white shadow-md" style={{ left: `${stats.temp}%` }}></div>
              </div>
           </div>
        </div>

        {/* Clock & Menu */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
           <button onClick={() => { document.exitPointerLock(); onOpenMenu(); }} className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-600">
              <Menu />
           </button>
           <div className="w-16 h-16 rounded-full bg-blue-900 border-2 border-gray-600 relative overflow-hidden shadow-lg">
              <div 
                className={`absolute inset-0 transition-colors duration-[5000ms] ${isNight ? 'bg-slate-900' : 'bg-sky-400'}`}
              >
                <div 
                  className="absolute w-full h-full" 
                  style={{ transform: `rotate(${timePercent * 3.6}deg)` }}
                >
                   <div className="w-4 h-4 bg-yellow-300 rounded-full shadow-[0_0_10px_rgba(253,224,71,0.8)] absolute top-1 left-1/2 -translate-x-1/2"></div>
                   <div className="w-3 h-3 bg-gray-200 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)] absolute bottom-1 left-1/2 -translate-x-1/2"></div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="flex justify-center mb-2 pointer-events-auto">
         <div className="bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10 flex gap-2 overflow-x-auto max-w-full">
            {inventory.map((item, idx) => {
              let color = 'transparent';
              if (item.type === ItemType.BLOCK && item.blockType) {
                 color = COLORS[item.blockType]?.top || '#fff';
              }
              
              return (
                <button 
                  key={idx}
                  onClick={() => onSelectSlot(idx)}
                  className={`w-12 h-12 rounded border-2 flex items-center justify-center relative transition-all ${
                    selectedSlot === idx 
                    ? 'border-yellow-400 bg-white/20 scale-110' 
                    : 'border-gray-600 bg-black/40 hover:bg-white/10'
                  }`}
                >
                  {item.type === ItemType.BLOCK ? (
                    <div className="w-6 h-6 border border-black/20 shadow-sm" style={{ backgroundColor: color }}></div>
                  ) : (
                    <span className="text-xs font-bold text-white uppercase">{item.name.substring(0, 2)}</span>
                  )}
                  <span className="absolute bottom-0 right-1 text-[10px] font-bold text-white drop-shadow-md">{item.count > 1 ? item.count : ''}</span>
                </button>
              );
            })}
         </div>
      </div>
    </div>
  );
};

export default HUD;
