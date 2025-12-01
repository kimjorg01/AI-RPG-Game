
import React, { useState, useMemo } from 'react';
import { CharacterStats } from '../types';
import { Minus, Plus, PlayCircle, RefreshCw } from 'lucide-react';

interface StatBuilderProps {
  onComplete: (stats: CharacterStats) => void;
}

const STAT_LABELS: Record<keyof CharacterStats, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  CHA: "Charisma",
  PER: "Perception",
  LUK: "Luck"
};

const STAT_COLORS: Record<keyof CharacterStats, string> = {
    STR: '#ef4444', // Red
    DEX: '#10b981', // Emerald
    CON: '#f97316', // Orange
    INT: '#3b82f6', // Blue
    CHA: '#a855f7', // Purple
    PER: '#06b6d4', // Cyan
    LUK: '#eab308'  // Yellow
};

const STAT_DESC: Record<keyof CharacterStats, string> = {
  STR: "Physical power, athletics, and combat prowess.",
  DEX: "Agility, stealth, reflexes, and ranged attacks.",
  CON: "Health, stamina, and resistance to injury.",
  INT: "Knowledge, reasoning, magic, and investigation.",
  CHA: "Persuasion, deception, intimidation, and leadership.",
  PER: "Awareness, senses, intuition, and finding secrets.",
  LUK: "Fate, chance, gambling, and critical moments."
};

export const StatBuilder: React.FC<StatBuilderProps> = ({ onComplete }) => {
  const [pool, setPool] = useState(4);
  
  // Base stats start at 10
  const [baseStats] = useState<CharacterStats>({
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    CHA: 10,
    PER: 10,
    LUK: 10,
  });
  
  const [allocated, setAllocated] = useState<CharacterStats>({ STR: 0, DEX: 0, CON: 0, INT: 0, CHA: 0, PER: 0, LUK: 0 });

  const getTotal = (key: keyof CharacterStats) => baseStats[key] + allocated[key];
  
  const getMod = (score: number) => Math.floor((score - 10) / 2);
  
  const formatMod = (score: number) => {
    const mod = getMod(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const handleAdd = (key: keyof CharacterStats) => {
    if (pool > 0 && getTotal(key) < 20) {
      setAllocated(prev => ({ ...prev, [key]: prev[key] + 1 }));
      setPool(p => p - 1);
    }
  };

  const handleRemove = (key: keyof CharacterStats) => {
    if (getTotal(key) > 8) {
      setAllocated(prev => ({ ...prev, [key]: prev[key] - 1 }));
      setPool(p => p + 1);
    }
  };

  const handleReset = () => {
      setAllocated({ STR: 0, DEX: 0, CON: 0, INT: 0, CHA: 0, PER: 0, LUK: 0 });
      setPool(4);
  };

  // Radar Chart Logic
  const radarData = useMemo(() => {
      const stats = Object.keys(STAT_LABELS) as Array<keyof CharacterStats>;
      const totalStats = stats.length;
      const radius = 100;
      const center = 120; // slightly larger than radius to avoid clipping
      
      // Calculate points for the polygon
      const points = stats.map((key, i) => {
          const value = getTotal(key);
          // Normalize value (assuming max reasonable stat is around 18-20 for display scaling)
          // Base 10 is roughly 50% of the graph
          const normalized = Math.min(value, 20) / 20; 
          const angle = (Math.PI * 2 * i) / totalStats - Math.PI / 2; // Start at top
          
          const x = center + radius * normalized * Math.cos(angle);
          const y = center + radius * normalized * Math.sin(angle);
          
          return `${x},${y}`;
      }).join(" ");

      // Calculate label positions
      const labels = stats.map((key, i) => {
          const angle = (Math.PI * 2 * i) / totalStats - Math.PI / 2;
          const labelRadius = radius + 25; // Push labels out a bit
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          return { key, x, y, label: STAT_LABELS[key] };
      });

      // Grid levels (e.g., 5, 10, 15, 20)
      const gridLevels = [5, 10, 15, 20].map(level => {
          const normalized = level / 20;
          const levelPoints = stats.map((_, i) => {
              const angle = (Math.PI * 2 * i) / totalStats - Math.PI / 2;
              const x = center + radius * normalized * Math.cos(angle);
              const y = center + radius * normalized * Math.sin(angle);
              return `${x},${y}`;
          }).join(" ");
          return { level, points: levelPoints };
      });

      return { points, labels, gridLevels, center, radius };
  }, [allocated, baseStats]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fadeIn w-full h-full flex flex-col">
      <div className="text-center mb-8">
         <h1 className="cinzel text-4xl font-bold text-zinc-100 mb-2">Forging Your Hero</h1>
         <p className="text-zinc-400 max-w-2xl mx-auto">
           You begin with balanced attributes. Distribute your <span className="text-amber-400 font-bold text-xl mx-1">{pool}</span> points to specialize your character.
         </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Stats Controls */}
        <div className="flex-1 w-full space-y-3">
            <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Attributes</span>
                <button 
                    onClick={handleReset}
                    disabled={pool === 4}
                    className="text-xs flex items-center gap-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-0 transition-all"
                >
                    <RefreshCw size={12} /> Reset
                </button>
            </div>

            {(Object.keys(STAT_LABELS) as Array<keyof CharacterStats>).map((key) => (
            <div key={key} className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 p-3 rounded-lg flex items-center gap-4 transition-all hover:bg-zinc-900">
                
                {/* Icon/Color Indicator */}
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: STAT_COLORS[key] }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <h3 className="font-bold text-zinc-200">{key}</h3>
                        <span className="text-xs text-zinc-500 hidden sm:inline-block truncate">{STAT_LABELS[key]}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">{STAT_DESC[key]}</div>
                </div>

                {/* Value Display */}
                <div className="flex flex-col items-center px-2">
                    <span className="text-xl font-bold font-mono text-zinc-100">{getTotal(key)}</span>
                    <span className={`text-[10px] font-mono ${getMod(getTotal(key)) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatMod(getTotal(key))}
                    </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => handleRemove(key)}
                        disabled={getTotal(key) <= 8}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                        <Minus size={14} />
                    </button>
                    <button 
                        onClick={() => handleAdd(key)}
                        disabled={pool === 0 || getTotal(key) >= 20}
                        className="w-8 h-8 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>
            ))}
        </div>

        {/* Right Column: Radar Chart & Summary */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6 sticky top-4">
            
            {/* Radar Chart Container */}
            <div className="aspect-square w-full bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4 relative flex items-center justify-center">
                <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
                    {/* Grid Levels */}
                    {radarData.gridLevels.map((level, i) => (
                        <g key={level.level}>
                            <polygon 
                                points={level.points} 
                                fill={i % 2 === 0 ? "#18181b" : "transparent"} 
                                stroke="#27272a" 
                                strokeWidth="1" 
                            />
                            {/* Axis Label */}
                            <text x={radarData.center} y={radarData.center - (radarData.radius * (level.level/20))} dy="-2" textAnchor="middle" className="text-[8px] fill-zinc-700 font-mono">
                                {level.level}
                            </text>
                        </g>
                    ))}

                    {/* Axis Lines */}
                    {radarData.labels.map((label) => (
                        <line 
                            key={`line-${label.key}`}
                            x1={radarData.center} 
                            y1={radarData.center} 
                            x2={label.x - (label.x - radarData.center) * 0.15} // Shorten slightly to not touch text
                            y2={label.y - (label.y - radarData.center) * 0.15}
                            stroke="#27272a" 
                            strokeWidth="1" 
                        />
                    ))}

                    {/* The Data Polygon */}
                    <polygon 
                        points={radarData.points} 
                        fill="rgba(245, 158, 11, 0.2)" 
                        stroke="#f59e0b" 
                        strokeWidth="2" 
                        className="transition-all duration-500 ease-out"
                    />

                    {/* Data Points */}
                    {(Object.keys(STAT_LABELS) as Array<keyof CharacterStats>).map((key, i) => {
                         const totalStats = 7;
                         const value = getTotal(key);
                         const normalized = Math.min(value, 20) / 20; 
                         const angle = (Math.PI * 2 * i) / totalStats - Math.PI / 2;
                         const x = radarData.center + radarData.radius * normalized * Math.cos(angle);
                         const y = radarData.center + radarData.radius * normalized * Math.sin(angle);
                         
                         return (
                             <circle 
                                key={`dot-${key}`}
                                cx={x} 
                                cy={y} 
                                r="3" 
                                fill={STAT_COLORS[key]} 
                                className="transition-all duration-500 ease-out"
                             />
                         );
                    })}

                    {/* Labels */}
                    {radarData.labels.map((label) => (
                        <g key={`label-${label.key}`}>
                            <text 
                                x={label.x} 
                                y={label.y} 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                className="text-[10px] font-bold fill-zinc-400 uppercase tracking-wider"
                            >
                                {label.key}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Action Button */}
            <button
                onClick={() => onComplete({
                    STR: getTotal('STR'),
                    DEX: getTotal('DEX'),
                    CON: getTotal('CON'),
                    INT: getTotal('INT'),
                    CHA: getTotal('CHA'),
                    PER: getTotal('PER'),
                    LUK: getTotal('LUK'),
                })}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-bold cinzel text-lg shadow-lg shadow-amber-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                <PlayCircle size={24} />
                Begin Adventure
            </button>
        </div>

      </div>
    </div>
  );
};
