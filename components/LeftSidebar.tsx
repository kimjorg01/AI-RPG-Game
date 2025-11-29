
import React, { useState } from 'react';
import { 
  Shield, 
  Sword, 
  Heart,
  User,
  Gem,
  ArrowUpCircle,
  AlertTriangle,
  Zap,
  Brain,
  Crown,
  X,
  Eye,
  Clover,
  ChevronLeft,
  ChevronRight,
  Activity,
  Hexagon
} from 'lucide-react';
import { CharacterStats, InventoryItem, EquippedGear, ItemType, StatusEffect, StatType } from '../types';

interface LeftSidebarProps {
  stats: CharacterStats;
  baseStats: CharacterStats;
  hp: number;
  maxHp: number;
  activeEffects: StatusEffect[];
  equipped: EquippedGear;
  inventory: InventoryItem[];
  isOpen: boolean;
  onEquip: (item: InventoryItem) => void;
  onUnequip?: (item: InventoryItem) => void; // Added optional handler
  highlightedStat?: StatType | null;
  draggedItemType?: string | null;
  previewStats?: CharacterStats;
}

const getMod = (score: number) => Math.floor((score - 10) / 2);
const formatMod = (score: number) => {
  const mod = getMod(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

// Map stats to their specific colors and icons
const STAT_CONFIG: Record<keyof CharacterStats, { label: string, abbr: string, icon: React.ElementType, border: string, text: string, glow: string }> = {
    STR: { label: "Strength", abbr: "STR", icon: Sword, border: 'border-red-900/50', text: 'text-red-500', glow: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
    DEX: { label: "Dexterity", abbr: "DEX", icon: Zap, border: 'border-emerald-900/50', text: 'text-emerald-500', glow: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
    CON: { label: "Constitution", abbr: "CON", icon: Shield, border: 'border-orange-900/50', text: 'text-orange-500', glow: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' },
    INT: { label: "Intelligence", abbr: "INT", icon: Brain, border: 'border-blue-900/50', text: 'text-blue-500', glow: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
    CHA: { label: "Charisma", abbr: "CHA", icon: Crown, border: 'border-purple-900/50', text: 'text-purple-500', glow: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' },
    PER: { label: "Perception", abbr: "PER", icon: Eye, border: 'border-teal-900/50', text: 'text-teal-500', glow: 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.4)]' },
    LUK: { label: "Luck", abbr: "LUK", icon: Clover, border: 'border-yellow-900/50', text: 'text-yellow-500', glow: 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' },
};

const SpiderGraph = ({ stats }: { stats: CharacterStats }) => {
    const MAX_STAT = 22;
    const CENTER = 100;
    const RADIUS = 70;
    const STAT_KEYS: (keyof CharacterStats)[] = ['STR', 'DEX', 'CON', 'INT', 'CHA', 'PER', 'LUK'];
    
    const getPoint = (value: number, index: number, max: number) => {
        const angle = (Math.PI * 2 * index) / 7 - Math.PI / 2; // Start at top
        const r = (Math.min(value, max) / max) * RADIUS;
        const x = CENTER + r * Math.cos(angle);
        const y = CENTER + r * Math.sin(angle);
        return `${x},${y}`;
    };

    const polyPoints = STAT_KEYS.map((key, i) => getPoint(stats[key], i, MAX_STAT)).join(' ');
    
    // Grid lines (25%, 50%, 75%, 100%)
    const grids = [0.25, 0.5, 0.75, 1].map(scale => 
        STAT_KEYS.map((_, i) => getPoint(MAX_STAT * scale, i, MAX_STAT)).join(' ')
    );

    return (
        <div className="w-full aspect-square relative flex items-center justify-center bg-zinc-900/30 rounded-full border border-zinc-800/50 p-4">
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                {/* Background Grid */}
                {grids.map((points, i) => (
                    <polygon key={i} points={points} fill="none" stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="2 2" opacity={0.3} />
                ))}
                
                {/* Stat Axes */}
                {STAT_KEYS.map((key, i) => {
                    const endPoint = getPoint(MAX_STAT, i, MAX_STAT);
                    const [x, y] = endPoint.split(',').map(Number);
                    // Label position (push out a bit)
                    const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
                    const lx = CENTER + (RADIUS + 15) * Math.cos(angle);
                    const ly = CENTER + (RADIUS + 15) * Math.sin(angle);
                    
                    return (
                        <g key={key}>
                            <line x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#3f3f46" strokeWidth="0.5" opacity={0.2} />
                            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#71717a" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                {key}
                            </text>
                        </g>
                    );
                })}

                {/* The Data Polygon */}
                <polygon points={polyPoints} fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                
                {/* Data Points */}
                {STAT_KEYS.map((key, i) => {
                    const point = getPoint(stats[key], i, MAX_STAT);
                    const [x, y] = point.split(',').map(Number);
                    return <circle key={key} cx={x} cy={y} r="2" fill="#f59e0b" />
                })}
            </svg>
        </div>
    );
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  stats, 
  baseStats, 
  hp, 
  maxHp, 
  activeEffects, 
  equipped,
  inventory,
  isOpen,
  onEquip,
  onUnequip,
  highlightedStat,
  draggedItemType,
  previewStats
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  
  // Calculate HP percentage
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  let hpColor = "bg-emerald-500";
  if (hpPercent < 50) hpColor = "bg-amber-500";
  if (hpPercent < 20) hpColor = "bg-red-600";

  const handleEquippedDragStart = (e: React.DragEvent, item: InventoryItem, slot: ItemType) => {
      e.dataTransfer.setData('itemId', item.id);
      e.dataTransfer.setData('origin', 'equipped');
      e.dataTransfer.setData('slot', slot);
  };

  const handleDropOnSlot = (e: React.DragEvent, slotType: ItemType) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData('itemId');
      const origin = e.dataTransfer.getData('origin');
      const itemType = e.dataTransfer.getData('itemType');

      if (origin === 'inventory' && itemType === slotType) {
          const item = inventory.find(i => i.id === itemId);
          if (item) onEquip(item);
      }
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-40 bg-zinc-950 border-r border-zinc-800 
        transform transition-all duration-300 ease-in-out flex flex-col shadow-2xl group/sidebar
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:relative md:shadow-none
        ${isCollapsed ? 'md:w-12' : 'md:w-80'}
      `}
    >
      {/* Desktop Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
            hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-50
            w-6 h-12 bg-zinc-800 border border-zinc-700 rounded-r-md items-center justify-center
            text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer
            ${isCollapsed ? 'opacity-100 translate-x-0' : 'opacity-0 group-hover/sidebar:opacity-100 -translate-x-2 group-hover/sidebar:translate-x-0'}
        `}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Collapsed State Vertical Text */}
      {isCollapsed && (
          <div className="hidden md:flex flex-col items-center h-full py-6 gap-8">
              <div className="p-2 bg-zinc-900 rounded-lg text-amber-500">
                  <User size={20} />
              </div>
              <div className="flex-1 flex items-center justify-center">
                  <span className="cinzel font-bold text-zinc-500 tracking-[0.2em] text-xs whitespace-nowrap -rotate-90 origin-center">
                      HERO ATTRIBUTES
                  </span>
              </div>
              <div className="flex flex-col gap-4 items-center pb-4">
                  <div className="w-1 h-16 bg-zinc-800 rounded-full overflow-hidden relative">
                      <div className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${hpColor}`} style={{ height: `${hpPercent}%` }} />
                  </div>
                  <Heart size={16} className={hpPercent < 20 ? 'text-red-500 animate-pulse' : 'text-zinc-600'} />
              </div>
          </div>
      )}

      {/* Expanded Content */}
      <div className={`
        flex flex-col h-full overflow-hidden transition-opacity duration-200
        ${isCollapsed ? 'md:opacity-0 md:pointer-events-none md:absolute' : 'opacity-100'}
      `}>
        <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
        
        {/* Header & Tabs */}
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-500">
                <Zap size={24} />
                <div>
                    <h1 className="cinzel font-bold text-lg leading-none">Hero</h1>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Attributes & Gear</p>
                </div>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                <button 
                    onClick={() => setActiveTab(0)}
                    className={`p-1.5 rounded transition-all ${activeTab === 0 ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                    title="Stats & Gear"
                >
                    <Activity size={16} />
                </button>
                <button 
                    onClick={() => setActiveTab(1)}
                    className={`p-1.5 rounded transition-all ${activeTab === 1 ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                    title="Ability Graph"
                >
                    <Hexagon size={16} />
                </button>
            </div>
        </div>

        {activeTab === 0 ? (
            <>
                {/* Vitality & Effects */}
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-zinc-400 font-bold flex items-center gap-2 cinzel text-xs uppercase tracking-widest">
                    <Heart size={14} className={hpPercent < 20 ? 'text-red-500 animate-pulse' : 'text-zinc-500'} />
                    Vitality
                    </h2>
                    <span className={`cinzel font-bold text-sm ${hpPercent < 20 ? 'text-red-500' : 'text-zinc-300'}`}>
                    {hp} / {maxHp}
                    </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50 mb-3">
                    <div 
                    className={`h-full transition-all duration-700 ease-out ${hpColor}`}
                    style={{ width: `${hpPercent}%` }}
                    />
                </div>

                {/* Active Effects - Token System */}
                {activeEffects.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-3">
                    {activeEffects.map((effect, idx) => (
                        <div 
                            key={idx} 
                            className="group relative cursor-help"
                            onMouseEnter={() => {
                                // Logic to highlight stats controlled by sidebar logic if needed
                            }}
                        >
                            <div className={`
                            flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors
                            ${effect.type === 'buff' 
                                ? 'border-emerald-800 text-emerald-500 hover:bg-emerald-950/30' 
                                : 'border-red-800 text-red-500 hover:bg-red-950/30'
                            }
                            `}>
                            <span>{effect.name}</span>
                            <span className="opacity-70 border-l border-current pl-1 ml-0.5">{effect.duration}t</span>
                            </div>
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-zinc-950 border border-zinc-700 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                <div className="flex items-center gap-1.5 mb-1">
                                    {effect.type === 'buff' ? <ArrowUpCircle size={10} className="text-emerald-500" /> : <AlertTriangle size={10} className="text-red-500" />}
                                    <span className={`text-xs font-bold ${effect.type === 'buff' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {effect.name}
                                    </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-snug">{effect.description}</p>
                                {effect.statModifiers && (
                                    <div className="mt-1 text-[9px] font-mono text-zinc-500">
                                        {Object.entries(effect.statModifiers).map(([k, v]) => (
                                            <div key={k}>{k}: {(v as number) > 0 ? '+' : ''}{v as number}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="text-[10px] text-zinc-700 italic pt-1">Healthy</div>
                )}
                </div>

                {/* Equipment & Stats Row */}
                <div className="flex gap-2">
                    {/* Equipment */}
                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex-1 min-w-0">
                        <h2 className="text-amber-400 font-bold mb-3 flex items-center gap-2 cinzel text-xs uppercase tracking-widest">
                            <Shield size={14} /> Gear
                        </h2>
                        <div className="flex flex-col gap-3">
                            
                            {/* Helper Component for Slots */}
                            {[
                                { slot: 'weapon', label: 'Main Hand', icon: Sword, color: 'text-amber-500' },
                                { slot: 'armor', label: 'Body', icon: Shield, color: 'text-blue-500' },
                                { slot: 'accessory', label: 'Trinket', icon: Gem, color: 'text-purple-500' }
                            ].map(({ slot, label, icon: Icon, color }) => {
                                const item = equipped[slot as keyof EquippedGear];
                                const isTarget = draggedItemType === slot;
                                
                                return (
                                    <div 
                                        key={slot}
                                        onDragOver={allowDrop}
                                        onDrop={(e) => handleDropOnSlot(e, slot as ItemType)}
                                        className={`min-h-[50px] rounded flex flex-row items-center transition-all duration-200 group/slot relative
                                            ${item 
                                                ? 'bg-zinc-900 border border-zinc-700 p-2 gap-3 shadow-sm' 
                                                : isTarget 
                                                    ? 'bg-amber-900/20 border-2 border-amber-500 border-dashed p-1 gap-2 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                                    : 'bg-transparent border border-transparent border-dashed hover:border-zinc-800 hover:bg-zinc-900/30 p-1 gap-2 opacity-50 hover:opacity-100'
                                            }
                                        `}
                                    >
                                        {item ? (
                                            <>
                                                <div className="w-8 h-8 rounded bg-zinc-950 flex items-center justify-center text-zinc-700 flex-shrink-0">
                                                    <Icon size={16} />
                                                </div>
                                                <div 
                                                    draggable 
                                                    onDragStart={(e) => handleEquippedDragStart(e, item, slot as ItemType)}
                                                    className="flex-1 cursor-grab active:cursor-grabbing min-w-0"
                                                >
                                                    <div className={`text-xs font-bold ${color} truncate pr-1`}>{item.name}</div>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="text-[9px] text-zinc-500 shrink-0">{label}</span>
                                                        {item.bonuses && (
                                                            <span className="text-[9px] text-emerald-500 font-mono truncate">
                                                                {Object.entries(item.bonuses).map(([k,v]) => `+${v} ${k}`).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Unequip Button */}
                                                {onUnequip && (
                                                    <button 
                                                        onClick={() => onUnequip(item)}
                                                        className="opacity-0 group-hover/slot:opacity-100 text-zinc-500 hover:text-red-500 p-1 transition-opacity"
                                                        title="Unequip"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-zinc-600 w-full cursor-default select-none">
                                                <div className="w-6 h-6 rounded bg-zinc-900/50 flex items-center justify-center flex-shrink-0">
                                                    <Icon size={12} />
                                                </div>
                                                <span className="text-[10px] uppercase tracking-wide font-medium">No {label}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Minimized Stats Column */}
                    <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 w-[70px] shrink-0 flex flex-col gap-1">
                         {(Object.keys(stats) as Array<keyof CharacterStats>).map((key) => {
                            const val = stats[key];
                            const previewVal = previewStats ? previewStats[key] : val;
                            const diff = previewVal - val;
                            
                            const displayVal = previewVal;
                            const mod = getMod(displayVal);
                            const config = STAT_CONFIG[key];
                            const isHighlighted = highlightedStat === key;
                            
                            // Determine color based on diff
                            let valColor = "text-zinc-200";
                            if (diff > 0) valColor = "text-emerald-400";
                            if (diff < 0) valColor = "text-red-400";
                            
                            return (
                                <div 
                                    key={key}
                                    className={`
                                        flex flex-col items-center justify-center py-1 rounded border transition-all duration-200 shrink-0
                                        ${isHighlighted ? config.glow + ' bg-zinc-900' : 'border-transparent hover:bg-zinc-900/30'}
                                        ${diff !== 0 ? 'bg-zinc-900 ring-1 ring-inset ' + (diff > 0 ? 'ring-emerald-500/30' : 'ring-red-500/30') : ''}
                                    `}
                                >
                                    <span className={`text-[9px] font-bold ${config.text}`}>{config.abbr}</span>
                                    
                                    <div className="flex items-center gap-0.5">
                                        <span className={`text-xs font-bold leading-none my-0.5 ${valColor}`}>{displayVal}</span>
                                        {diff !== 0 && (
                                            <span className={`text-[8px] ${diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {diff > 0 ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>

                                    <span className={`text-[8px] font-mono ${mod > 0 ? 'text-emerald-500' : mod < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                                        {mod >= 0 ? '+' : ''}{mod}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col p-4 animate-fadeIn overflow-y-auto custom-scrollbar gap-6">
                <div>
                    <h2 className="cinzel text-amber-500 font-bold mb-4 text-center">Ability Matrix</h2>
                    <SpiderGraph stats={previewStats || stats} />
                </div>

                {/* Detailed Abilities List */}
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <h2 className="text-zinc-400 font-bold mb-3 flex items-center gap-2 cinzel uppercase tracking-widest text-xs">
                        <User size={14} />
                        Detailed Stats
                    </h2>
                    <div className="space-y-2">
                        {(Object.keys(stats) as Array<keyof CharacterStats>).map((key) => {
                            const val = stats[key];
                            const previewVal = previewStats ? previewStats[key] : val;
                            const diff = previewVal - val;

                            const base = baseStats[key];
                            const bonus = previewVal - base;
                            const isHighlighted = highlightedStat === key;
                            const config = STAT_CONFIG[key];
                            const Icon = config.icon;

                            return (
                                <div 
                                    key={key} 
                                    className={`
                                        flex items-center justify-between bg-zinc-900 border-2 p-2 rounded relative overflow-hidden group transition-all duration-300
                                        ${isHighlighted ? config.glow : config.border}
                                        ${diff !== 0 ? (diff > 0 ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-red-500/50 bg-red-950/10') : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon size={16} className={`${config.text} opacity-70`} />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none mb-0.5">{config.label}</span>
                                            <span className={`text-[9px] font-bold ${isHighlighted ? config.text : 'text-zinc-600'}`}>({config.abbr})</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-baseline gap-2">
                                        {diff !== 0 && (
                                            <span className="text-[10px] text-zinc-500 line-through mr-1">{val}</span>
                                        )}
                                        <span className={`text-lg font-bold cinzel ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : (bonus > 0 ? 'text-emerald-400' : bonus < 0 ? 'text-red-400' : 'text-zinc-200')}`}>
                                            {previewVal}
                                        </span>
                                        <span className={`text-[10px] font-mono w-6 text-right ${getMod(previewVal) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {formatMod(previewVal)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}
        </div>
      </div>
    </aside>
  );
};
