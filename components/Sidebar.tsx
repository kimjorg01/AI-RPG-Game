
import React, { useState } from 'react';
import { 
  Backpack, 
  ScrollText, 
  Shield, 
  Sword, 
  FlaskConical, 
  Key, 
  Gem, 
  Coins,
  Skull,
  Heart,
  User,
  HelpCircle,
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle
} from 'lucide-react';
import { CharacterStats, InventoryItem, EquippedGear, ItemType, StatusEffect } from '../types';

interface SidebarProps {
  inventory: InventoryItem[];
  equipped: EquippedGear;
  currentQuest: string;
  hp: number;
  maxHp: number;
  stats: CharacterStats;
  baseStats: CharacterStats;
  activeEffects?: StatusEffect[];
  isOpen: boolean;
  onEquip: (item: InventoryItem) => void;
  onUnequip: (item: InventoryItem) => void;
}

const getIconForItem = (name: string, type: ItemType) => {
  if (type === 'weapon') return <Sword size={14} />;
  if (type === 'armor') return <Shield size={14} />;
  if (type === 'accessory') return <Gem size={14} />;
  
  const lower = name.toLowerCase();
  if (lower.includes('potion') || lower.includes('elixir')) return <FlaskConical size={14} />;
  if (lower.includes('key')) return <Key size={14} />;
  if (lower.includes('gem') || lower.includes('gold')) return <Coins size={14} />;
  if (lower.includes('skull') || lower.includes('bone')) return <Skull size={14} />;
  if (lower.includes('scroll') || lower.includes('map')) return <ScrollText size={14} />;
  
  return <HelpCircle size={14} />;
};

const getMod = (score: number) => Math.floor((score - 10) / 2);
const formatMod = (score: number) => {
  const mod = getMod(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  inventory, 
  equipped,
  currentQuest, 
  hp, 
  maxHp, 
  stats, 
  baseStats,
  activeEffects = [],
  isOpen,
  onEquip,
  onUnequip
}) => {
  
  const [isDragging, setIsDragging] = useState(false);

  // Calculate HP percentage for bar width
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  
  // Color logic for HP bar
  let hpColor = "bg-emerald-500";
  if (hpPercent < 50) hpColor = "bg-amber-500";
  if (hpPercent < 20) hpColor = "bg-red-600";

  const handleDragStart = (e: React.DragEvent, item: InventoryItem) => {
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.setData('origin', 'inventory');
    e.dataTransfer.setData('itemType', item.type);
    setIsDragging(true);
  };

  const handleEquippedDragStart = (e: React.DragEvent, item: InventoryItem, slot: ItemType) => {
      e.dataTransfer.setData('itemId', item.id);
      e.dataTransfer.setData('origin', 'equipped');
      e.dataTransfer.setData('slot', slot);
      setIsDragging(true);
  };

  const handleDropOnSlot = (e: React.DragEvent, slotType: ItemType) => {
      e.preventDefault();
      setIsDragging(false);
      const itemId = e.dataTransfer.getData('itemId');
      const origin = e.dataTransfer.getData('origin');
      const itemType = e.dataTransfer.getData('itemType');

      if (origin === 'inventory' && itemType === slotType) {
          const item = inventory.find(i => i.id === itemId);
          if (item) onEquip(item);
      }
  };

  const handleDropOnInventory = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const itemId = e.dataTransfer.getData('itemId');
      const origin = e.dataTransfer.getData('origin');
      const slot = e.dataTransfer.getData('slot') as ItemType;

      if (origin === 'equipped') {
          const item = equipped[slot as keyof EquippedGear];
          if (item && item.id === itemId) {
              onUnequip(item);
          }
      }
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  return (
    <aside 
      className={`
        fixed md:relative z-20 h-full bg-zinc-900 border-r border-zinc-800 
        transition-all duration-300 ease-in-out w-80 flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-80'} 
        md:block flex flex-col shadow-2xl md:shadow-none
      `}
    >
      <div className="p-6 overflow-y-auto flex flex-col gap-6 h-full">
        <div className="mb-1">
            <h1 className="cinzel text-2xl font-bold text-amber-500 tracking-wider">
                Adventure AI
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Infinite RPG Engine</p>
        </div>

        {/* Health Section */}
        <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800 shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-zinc-400 font-bold flex items-center gap-2 cinzel text-sm uppercase tracking-widest">
              <Heart size={16} className={hpPercent < 20 ? 'text-red-500 animate-pulse' : 'text-zinc-500'} />
              Vitality
            </h2>
            <span className={`cinzel font-bold ${hpPercent < 20 ? 'text-red-500' : 'text-zinc-300'}`}>
              {hp} / {maxHp}
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50 mb-3">
            <div 
              className={`h-full transition-all duration-700 ease-out ${hpColor} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          {/* Status Effects List */}
          {activeEffects.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
               {activeEffects.map((effect, idx) => (
                   <div 
                     key={idx} 
                     className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border ${
                         effect.type === 'buff' 
                         ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400' 
                         : 'bg-red-950/30 border-red-800 text-red-400'
                     }`}
                     title={effect.description + (effect.statModifiers ? ` ${JSON.stringify(effect.statModifiers)}` : '')}
                   >
                       {effect.type === 'buff' ? <ArrowUpCircle size={10} /> : <AlertTriangle size={10} />}
                       <span className="font-bold">{effect.name}</span>
                       <span className="opacity-70 ml-1">({effect.duration}t)</span>
                   </div>
               ))}
            </div>
          )}
        </div>

        {/* Character Stats */}
        <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800">
             <h2 className="text-zinc-400 font-bold mb-3 flex items-center gap-2 cinzel uppercase tracking-widest text-sm">
                <User size={16} />
                Abilities
             </h2>
             <div className="grid grid-cols-3 gap-2">
                {(Object.keys(stats) as Array<keyof CharacterStats>).map((key) => {
                    const val = stats[key];
                    const base = baseStats[key];
                    const bonus = val - base;
                    return (
                        <div key={key} className="bg-zinc-900 border border-zinc-800 p-2 rounded flex flex-col items-center relative overflow-hidden">
                            {bonus !== 0 && (
                                <div className={`absolute top-0 right-0 w-2 h-2 rounded-bl-full ${bonus > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            )}
                            <span className="text-[10px] text-zinc-500 font-bold">{key}</span>
                            <span className={`text-lg font-bold cinzel ${bonus > 0 ? 'text-emerald-400' : bonus < 0 ? 'text-red-400' : 'text-zinc-200'}`}>{val}</span>
                            <span className={`text-[10px] font-mono ${getMod(val) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatMod(val)}
                            </span>
                        </div>
                    );
                })}
             </div>
        </div>

        {/* Paper Doll Equipment */}
        <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800">
             <h2 className="text-amber-400 font-bold mb-3 flex items-center gap-2 cinzel text-sm uppercase tracking-widest">
                 <Shield size={16} /> Equipment
             </h2>
             <div className="grid grid-cols-3 gap-2">
                 {/* Weapon Slot */}
                 <div 
                    onDragOver={allowDrop}
                    onDrop={(e) => handleDropOnSlot(e, 'weapon')}
                    className={`aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center p-1 transition-colors ${equipped.weapon ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/30 border-zinc-800 hover:border-amber-900'}`}
                 >
                     {equipped.weapon ? (
                         <div 
                            draggable 
                            onDragStart={(e) => handleEquippedDragStart(e, equipped.weapon!, 'weapon')}
                            className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
                         >
                             <Sword size={24} className="text-amber-500 mb-1" />
                             <span className="text-[9px] text-center leading-tight line-clamp-2 w-full">{equipped.weapon.name}</span>
                         </div>
                     ) : (
                         <div className="text-zinc-700 flex flex-col items-center">
                             <Sword size={20} />
                             <span className="text-[9px] mt-1">Weapon</span>
                         </div>
                     )}
                 </div>

                 {/* Armor Slot */}
                 <div 
                    onDragOver={allowDrop}
                    onDrop={(e) => handleDropOnSlot(e, 'armor')}
                    className={`aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center p-1 transition-colors ${equipped.armor ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/30 border-zinc-800 hover:border-amber-900'}`}
                 >
                     {equipped.armor ? (
                         <div 
                            draggable 
                            onDragStart={(e) => handleEquippedDragStart(e, equipped.armor!, 'armor')}
                            className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
                         >
                             <Shield size={24} className="text-blue-500 mb-1" />
                             <span className="text-[9px] text-center leading-tight line-clamp-2 w-full">{equipped.armor.name}</span>
                         </div>
                     ) : (
                         <div className="text-zinc-700 flex flex-col items-center">
                             <Shield size={20} />
                             <span className="text-[9px] mt-1">Armor</span>
                         </div>
                     )}
                 </div>

                 {/* Accessory Slot */}
                 <div 
                    onDragOver={allowDrop}
                    onDrop={(e) => handleDropOnSlot(e, 'accessory')}
                    className={`aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center p-1 transition-colors ${equipped.accessory ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/30 border-zinc-800 hover:border-amber-900'}`}
                 >
                     {equipped.accessory ? (
                         <div 
                            draggable 
                            onDragStart={(e) => handleEquippedDragStart(e, equipped.accessory!, 'accessory')}
                            className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
                         >
                             <Gem size={24} className="text-purple-500 mb-1" />
                             <span className="text-[9px] text-center leading-tight line-clamp-2 w-full">{equipped.accessory.name}</span>
                         </div>
                     ) : (
                         <div className="text-zinc-700 flex flex-col items-center">
                             <Gem size={20} />
                             <span className="text-[9px] mt-1">Relic</span>
                         </div>
                     )}
                 </div>
             </div>
        </div>

        {/* Quest Section */}
        <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800">
          <h2 className="text-amber-400 font-bold mb-3 flex items-center gap-2 cinzel text-sm">
            <ScrollText size={16} />
            Current Quest
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed italic">
            "{currentQuest || 'Explore the world to find your purpose...'}"
          </p>
        </div>

        {/* Inventory Section */}
        <div 
            className={`flex-1 min-h-[100px] flex flex-col ${isDragging ? 'bg-zinc-900/30 ring-2 ring-amber-900/50 rounded' : ''}`}
            onDragOver={allowDrop}
            onDrop={handleDropOnInventory}
        >
          <h2 className="text-zinc-400 font-bold mb-4 flex items-center gap-2 cinzel uppercase tracking-widest text-sm">
            <Backpack size={16} />
            Inventory
          </h2>
          
          {inventory.length === 0 ? (
            <div className="text-zinc-600 text-sm italic text-center py-8 border border-dashed border-zinc-800 rounded">
              Empty
            </div>
          ) : (
            <ul className="space-y-2 pb-4">
              {inventory.map((item) => (
                <li 
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className="bg-zinc-800 p-2.5 rounded border border-zinc-700 text-sm text-zinc-200 flex items-center gap-3 shadow-sm hover:border-amber-900/50 transition-colors group cursor-grab active:cursor-grabbing"
                >
                  <div className="bg-zinc-900 p-1.5 rounded-full text-amber-600 group-hover:text-amber-400 transition-colors border border-zinc-800 relative flex-shrink-0">
                    {getIconForItem(item.name, item.type)}
                    {item.bonuses && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                        </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-start">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.type !== 'misc' && (
                              <span className="text-[9px] uppercase tracking-wide text-zinc-500 bg-zinc-900 px-1 rounded border border-zinc-800 ml-2">
                                  {item.type}
                              </span>
                          )}
                      </div>
                      
                      {item.bonuses && (
                          <div className="text-[10px] text-zinc-500 flex gap-2 mt-0.5">
                              {Object.entries(item.bonuses).map(([stat, val]) => (
                                  <span key={stat} className="text-emerald-500 font-mono">+{val} {stat}</span>
                              ))}
                          </div>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="text-[10px] text-zinc-700 text-center mt-auto pt-4 border-t border-zinc-800">
             Powered by Gemini 3 Pro
        </div>
      </div>
    </aside>
  );
};
