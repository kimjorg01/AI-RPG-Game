
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
  Ghost,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { InventoryItem, EquippedGear, ItemType, NPC, MainStoryArc } from '../types';

interface RightSidebarProps {
  currentQuest: string;
  inventory: InventoryItem[];
  equipped: EquippedGear; 
  npcs?: NPC[];
  isOpen: boolean;
  onEquip: (item: InventoryItem) => void;
  onUnequip: (item: InventoryItem) => void;
  onDiscard: (item: InventoryItem) => void;
  setDraggedItemType: (type: string | null) => void;
  draggedItemType: string | null;
  mainStoryArc?: MainStoryArc;
  onHoverItem?: (item: InventoryItem | null) => void;
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
  onUnequip,
  onDiscard,
  setDraggedItemType,
  draggedItemType,
  mainStoryArc,
  onHoverItem
}) => {
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);

  const handleDragStart = (e: React.DragEvent, item: InventoryItem) => {
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.setData('origin', 'inventory');
    e.dataTransfer.setData('itemType', item.type);
    setDraggedItemType(item.type);
  };

  const handleDragEnd = () => {
      setDraggedItemType(null);
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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'story' | 'people'>('items');

  return (
    <aside 
      className={`
        fixed inset-y-0 right-0 z-40 bg-zinc-950 border-l border-zinc-800 
        transform transition-all duration-300 ease-in-out flex flex-col shadow-2xl group/sidebar
        ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0 md:relative md:shadow-none
        ${isCollapsed ? 'md:w-12' : 'md:w-80'}
      `}
    >
      {/* Desktop Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
            hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-50
            w-6 h-12 bg-zinc-800 border border-zinc-700 rounded-l-md items-center justify-center
            text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer
            ${isCollapsed ? 'opacity-100 translate-x-0' : 'opacity-0 group-hover/sidebar:opacity-100 translate-x-2 group-hover/sidebar:translate-x-0'}
        `}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Collapsed State Vertical Text */}
      {isCollapsed && (
          <div className="hidden md:flex flex-col items-center h-full py-6 gap-8">
              <div className="p-2 bg-zinc-900 rounded-lg text-emerald-500">
                  <Backpack size={20} />
              </div>
              <div className="flex-1 flex items-center justify-center">
                  <span className="cinzel font-bold text-zinc-500 tracking-[0.2em] text-xs whitespace-nowrap rotate-90 origin-center">
                      INVENTORY & QUESTS
                  </span>
              </div>
              <div className="flex flex-col gap-2 items-center pb-4 text-zinc-600">
                  <span className="text-[10px] font-bold">{inventory.length}</span>
                  <div className="w-8 h-[1px] bg-zinc-800"></div>
                  <ScrollText size={16} />
              </div>
          </div>
      )}

      {/* Expanded Content */}
      <div className={`
        flex flex-col h-full overflow-hidden transition-opacity duration-200
        ${isCollapsed ? 'md:opacity-0 md:pointer-events-none md:absolute' : 'opacity-100'}
      `}>
        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
            <button
                onClick={() => setActiveTab('items')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                    activeTab === 'items' 
                    ? 'bg-zinc-900/50 text-amber-500 border-b-2 border-amber-500' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                }`}
            >
                Items
            </button>
            <button
                onClick={() => setActiveTab('story')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                    activeTab === 'story' 
                    ? 'bg-zinc-900/50 text-amber-500 border-b-2 border-amber-500' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                }`}
            >
                Story
            </button>
            <button
                onClick={() => setActiveTab('people')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                    activeTab === 'people' 
                    ? 'bg-zinc-900/50 text-amber-500 border-b-2 border-amber-500' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                }`}
            >
                People
            </button>
        </div>

        <div className="p-4 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
        
        {activeTab === 'items' && (
            <>
                {/* Header */}
                <div className="flex items-center gap-2 text-amber-500 mb-2 justify-end">
                    <div className="text-right">
                        <h1 className="cinzel font-bold text-lg leading-none">Inventory</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Gear & Loot</p>
                    </div>
                    <Backpack size={24} />
                </div>

                {/* Inventory Section */}
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden shrink-0">
                    <button 
                        onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                        className="w-full p-3 flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 transition-colors group"
                    >
                        <div className="flex items-center gap-2 text-zinc-400 font-bold cinzel uppercase tracking-widest text-xs group-hover:text-zinc-300">
                            <Backpack size={14} />
                            Inventory ({inventory.length}/8)
                        </div>
                        {isInventoryOpen ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                    </button>
                    
                    {isInventoryOpen && (
                        <div 
                            className={`p-3 bg-zinc-950/50 transition-all duration-300 ${isDraggingOver ? 'bg-amber-950/10 ring-2 ring-amber-500/30' : ''}`}
                            onDragOver={allowDrop}
                            onDrop={handleDropOnInventory}
                            onDragLeave={handleDragLeave}
                        >
                            <div className="grid grid-cols-2 gap-2">
                                {Array.from({ length: 8 }).map((_, index) => {
                                    const item = inventory[index];
                                    return (
                                        <div 
                                            key={index} 
                                            className={`
                                                aspect-[1.5/1] bg-zinc-900 border border-zinc-800 rounded flex flex-col relative group/item overflow-hidden
                                                ${item ? 'hover:border-zinc-600' : 'opacity-50'}
                                            `}
                                            onMouseEnter={() => item && onHoverItem?.(item)}
                                            onMouseLeave={() => onHoverItem?.(null)}
                                        >
                                            {item ? (
                                                <>
                                                    {/* Top Bar: Name & Close */}
                                                    <div className="flex justify-between items-start p-1.5 bg-zinc-950/30">
                                                        <span className="text-[10px] font-bold text-zinc-300 truncate max-w-[80%] leading-tight" title={item.name}>
                                                            {item.name}
                                                        </span>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onDiscard(item); }}
                                                            className="text-zinc-600 hover:text-red-500 transition-colors"
                                                            title="Discard"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Main Content: Icon & Bonus */}
                                                    <div 
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, item)}
                                                        onDragEnd={handleDragEnd}
                                                        className="flex-1 flex items-center px-2 gap-2 cursor-grab active:cursor-grabbing"
                                                    >
                                                        <div className="text-zinc-500 shrink-0">
                                                            {getIconForItem(item.name, item.type)}
                                                        </div>
                                                        
                                                        <div className="flex flex-col min-w-0">
                                                            {item.bonuses ? (
                                                                <div className="text-[10px] text-emerald-500 font-mono leading-tight">
                                                                    {Object.entries(item.bonuses).map(([k, v]) => (
                                                                        <div key={k}>+{v} {k}</div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[9px] text-zinc-600 italic">No stats</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Footer: Equip Button */}
                                                    {['weapon', 'armor', 'accessory'].includes(item.type) && (
                                                        <button 
                                                            onClick={() => onEquip(item)}
                                                            className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-500 text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 border-t border-zinc-800"
                                                        >
                                                            <MousePointer2 size={8} /> Equip
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-10 text-zinc-700">
                                                    <div className="w-1 h-1 rounded-full bg-current" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {isDraggingOver && <div className="text-center text-[10px] text-amber-500 mt-2 animate-pulse font-bold tracking-wide">DROP TO UNEQUIP</div>}
                        </div>
                    )}
                </div>

                {/* Discard Drop Zone */}
                {draggedItemType && (
                    <div 
                        className="mt-2 h-16 border-2 border-dashed border-red-500/30 bg-red-950/10 rounded-lg flex flex-col items-center justify-center text-red-500/70 transition-all duration-300 hover:bg-red-950/30 hover:border-red-500 hover:text-red-400"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const itemId = e.dataTransfer.getData('itemId');
                            const item = inventory.find(i => i.id === itemId);
                            if (item) onDiscard(item);
                            setDraggedItemType(null);
                        }}
                    >
                        <div className="flex items-center gap-2 pointer-events-none">
                            <Skull size={16} />
                            <span className="font-bold uppercase tracking-widest text-[10px]">Drop to Discard</span>
                        </div>
                    </div>
                )}
                
                <div className="text-[10px] text-zinc-800 text-center mt-auto opacity-50 hover:opacity-100 transition-opacity pb-2">
                    Drag items to equip/unequip
                </div>
            </>
        )}

        {activeTab === 'story' && (
            <>
                {/* Header */}
                <div className="flex items-center gap-2 text-amber-500 mb-2 justify-end">
                    <div className="text-right">
                        <h1 className="cinzel font-bold text-lg leading-none">Quest Log</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Campaign Progress</p>
                    </div>
                    <ScrollText size={24} />
                </div>

                {/* Current Objective (Immediate) */}
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 shadow-inner">
                    <h2 className="text-amber-400 font-bold mb-3 flex items-center gap-2 cinzel text-xs uppercase tracking-widest">
                        <MousePointer2 size={14} />
                        Current Focus
                    </h2>
                    <p className="text-zinc-300 text-sm leading-relaxed italic border-l-2 border-amber-900/50 pl-3">
                        "{currentQuest || 'Explore the world to find your purpose...'}"
                    </p>
                </div>

                {mainStoryArc ? (
                    <div className="space-y-4">
                        {/* Campaign Info */}
                        <div className="bg-zinc-900/30 p-3 rounded border border-zinc-800/50">
                            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-wider mb-1">Campaign</h3>
                            <div className="text-amber-500 font-bold cinzel">{mainStoryArc.campaignTitle}</div>
                            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{mainStoryArc.backgroundLore}</p>
                        </div>

                        {/* Main Quests */}
                        <div className="space-y-2">
                            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                <MapIcon size={12} /> Main Story Arc
                            </h3>
                            <div className="relative pl-4 border-l border-zinc-800 space-y-6">
                                {mainStoryArc.mainQuests.map((quest, idx) => (
                                    <div key={quest.id} className="relative">
                                        {/* Timeline Dot */}
                                        <div className={`
                                            absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full border-2 
                                            ${quest.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 
                                              quest.status === 'active' ? 'bg-amber-500 border-amber-500 animate-pulse' : 
                                              'bg-zinc-900 border-zinc-700'}
                                        `} />
                                        
                                        <div className={`transition-opacity ${quest.status === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
                                            <div className="text-xs font-bold text-zinc-300 mb-1">
                                                Act {idx + 1}: {quest.title}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                                {quest.description}
                                            </p>
                                            {quest.status === 'active' && (
                                                <span className="inline-block mt-2 text-[9px] font-bold text-amber-500 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/50">
                                                    IN PROGRESS
                                                </span>
                                            )}
                                            {quest.status === 'completed' && (
                                                <span className="inline-block mt-2 text-[9px] font-bold text-emerald-500 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50">
                                                    COMPLETED
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Final Objective */}
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full border-2 bg-zinc-900 border-purple-500" />
                                    <div>
                                        <div className="text-xs font-bold text-purple-400 mb-1">
                                            Finale: The Ultimate Goal
                                        </div>
                                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                                            {mainStoryArc.finalObjective}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-zinc-600 text-xs italic">
                        No main story arc generated yet.
                    </div>
                )}
            </>
        )}

        {activeTab === 'people' && (
            <>
                {/* Header */}
                <div className="flex items-center gap-2 text-amber-500 mb-2 justify-end">
                    <div className="text-right">
                        <h1 className="cinzel font-bold text-lg leading-none">People</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">NPCs & Creatures</p>
                    </div>
                    <Users size={24} />
                </div>

                {/* NPC / People Section */}
                {npcs.length > 0 ? (
                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
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
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-700 gap-2">
                        <Ghost size={32} strokeWidth={1} />
                        <span className="text-xs uppercase tracking-widest">No one met yet</span>
                    </div>
                )}
            </>
        )}
        
        </div>
      </div>
    </aside>
  );
};
