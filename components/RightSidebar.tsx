
import React, { useState } from 'react';
import { 
  Backpack, 
  ScrollText, 
  Sword, 
  Shield, 
  Gem, 
  FlaskConical, 
  Key, 
  Coins,
  Skull,
  HelpCircle,
  Map as MapIcon,
  MousePointer2,
  Users,
  Smile,
  Frown,
  Meh,
  Ghost
} from 'lucide-react';
import { InventoryItem, EquippedGear, ItemType, NPC } from '../types';

interface RightSidebarProps {
  currentQuest: string;
  inventory: InventoryItem[];
  equipped: EquippedGear; 
  npcs?: NPC[];
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
  if (lower.includes('scroll') || lower.includes('map')) return <MapIcon size={14} />;
  
  return <HelpCircle size={14} />;
};

const getNPCIcon = (type: string, condition: string) => {
    if (condition === 'Dead') return <Skull size={14} className="text-zinc-600" />;
    if (type === 'Hostile') return <Frown size={14} className="text-red-500" />;
    if (type === 'Friendly') return <Smile size={14} className="text-emerald-500" />;
    if (type === 'Unknown') return <Ghost size={14} className="text-purple-500" />;
    return <Users size={14} className="text-zinc-400" />;
};

export const RightSidebar: React.FC<RightSidebarProps> = ({ 
  currentQuest, 
  inventory,
  equipped,
  npcs = [],
  isOpen,
  onEquip,
  onUnequip
}) => {
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragStart = (e: React.DragEvent, item: InventoryItem) => {
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.setData('origin', 'inventory');
    e.dataTransfer.setData('itemType', item.type);
  };

  const handleDropOnInventory = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
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

  const allowDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(true);
  };
  
  const handleDragLeave = () => setIsDraggingOver(false);

  return (
    <aside 
      className={`
        fixed inset-y-0 right-0 z-40 w-80 bg-zinc-950 border-l border-zinc-800 
        transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:relative md:shadow-none
      `}
    >
      <div className="p-4 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-2 text-amber-500 mb-2 justify-end">
            <div className="text-right">
                <h1 className="cinzel font-bold text-lg leading-none">Journal</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Quests, Items & People</p>
            </div>
            <Backpack size={24} />
        </div>

        {/* Quest Section */}
        <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 shadow-inner">
          <h2 className="text-amber-400 font-bold mb-3 flex items-center gap-2 cinzel text-xs uppercase tracking-widest">
            <ScrollText size={14} />
            Current Objective
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed italic border-l-2 border-amber-900/50 pl-3">
            "{currentQuest || 'Explore the world to find your purpose...'}"
          </p>
        </div>

        {/* Inventory Section */}
        <div 
            className={`flex-1 flex flex-col transition-all duration-300 min-h-[200px] ${isDraggingOver ? 'bg-amber-950/10 ring-2 ring-amber-500/30 rounded-lg' : ''}`}
            onDragOver={allowDrop}
            onDrop={handleDropOnInventory}
            onDragLeave={handleDragLeave}
        >
          <div className="flex items-center justify-between mb-3 px-1">
             <h2 className="text-zinc-400 font-bold cinzel uppercase tracking-widest text-xs flex items-center gap-2">
                 <Backpack size={14} />
                 Inventory ({inventory.length})
             </h2>
             {isDraggingOver && <span className="text-amber-500 text-[10px] animate-pulse">Drop to Unequip</span>}
          </div>
          
          {inventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-zinc-700 space-y-2 opacity-50 py-8 bg-zinc-900/20 rounded border border-dashed border-zinc-800">
               <Backpack size={24} strokeWidth={1} />
               <span className="text-xs uppercase tracking-widest font-medium">Bag Empty</span>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {inventory.map((item) => (
                <div 
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className="bg-zinc-900 p-2.5 rounded border border-zinc-800 text-sm text-zinc-200 flex items-center gap-3 shadow-sm hover:border-zinc-700 transition-colors group cursor-grab active:cursor-grabbing relative"
                >
                  <div className="bg-zinc-950 p-2 rounded text-zinc-500 border border-zinc-800 relative flex-shrink-0 self-start mt-0.5">
                    {getIconForItem(item.name, item.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex flex-col">
                          <span className="font-medium truncate pr-2 leading-tight">{item.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                         <span className="text-[9px] uppercase tracking-wide text-zinc-600 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/50">
                             {item.type}
                         </span>
                         {item.bonuses && (
                            <span className="text-[10px] text-emerald-500 font-mono whitespace-nowrap">
                                {Object.entries(item.bonuses).map(([k, v]) => `+${v} ${k}`).join(', ')}
                            </span>
                         )}
                      </div>
                      
                      {/* Equip Button (Mobile friendly / Mouse friendly) */}
                      {['weapon', 'armor', 'accessory'].includes(item.type) && (
                        <button
                            onClick={() => onEquip(item)}
                            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-amber-500 border border-zinc-700 px-2 py-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center gap-1 w-fit mt-1"
                            title="Equip Item"
                        >
                            <MousePointer2 size={10} /> Equip
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NPC / People Section */}
        {npcs.length > 0 && (
            <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                <h2 className="text-zinc-400 font-bold mb-3 flex items-center gap-2 cinzel text-xs uppercase tracking-widest">
                    <Users size={14} />
                    People & Creatures
                </h2>
                <div className="space-y-2">
                    {npcs.map((npc) => (
                        <div key={npc.id} className="flex items-center gap-3 bg-zinc-900 p-2 rounded border border-zinc-800/50">
                            <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                                {getNPCIcon(npc.type, npc.condition)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-bold ${npc.condition === 'Dead' ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
                                        {npc.name}
                                    </span>
                                    <span className={`text-[9px] font-mono px-1.5 rounded ${
                                        npc.condition === 'Healthy' ? 'text-emerald-500 bg-emerald-900/10' :
                                        npc.condition === 'Injured' ? 'text-amber-500 bg-amber-900/10' :
                                        npc.condition === 'Dead' ? 'text-zinc-600 bg-zinc-900' :
                                        'text-red-500 bg-red-900/10'
                                    }`}>
                                        {npc.condition}
                                    </span>
                                </div>
                                <div className="text-[10px] text-zinc-500 truncate">
                                    {npc.type}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        <div className="text-[10px] text-zinc-800 text-center mt-auto opacity-50 hover:opacity-100 transition-opacity pb-2">
             Drag items to equip/unequip
        </div>
      </div>
    </aside>
  );
};
