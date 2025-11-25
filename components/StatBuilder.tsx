
import React, { useState } from 'react';
import { CharacterStats } from '../types';
import { Minus, Plus, PlayCircle } from 'lucide-react';

interface StatBuilderProps {
  onComplete: (stats: CharacterStats) => void;
}

const STAT_LABELS: Record<keyof CharacterStats, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  CHA: "Charisma",
  PER: "Perception"
};

const STAT_DESC: Record<keyof CharacterStats, string> = {
  STR: "Physical power, athletics, and combat prowess.",
  DEX: "Agility, stealth, reflexes, and ranged attacks.",
  CON: "Health, stamina, and resistance to injury.",
  INT: "Knowledge, reasoning, magic, and investigation.",
  CHA: "Persuasion, deception, intimidation, and leadership.",
  PER: "Awareness, intuition, and noticing hidden details."
};

export const StatBuilder: React.FC<StatBuilderProps> = ({ onComplete }) => {
  const [pool, setPool] = useState(5);
  
  // Base stats start at 10 + slight variance
  const [baseStats] = useState<CharacterStats>(() => ({
    STR: 10 + Math.floor(Math.random() * 4) - 1,
    DEX: 10 + Math.floor(Math.random() * 4) - 1,
    CON: 10 + Math.floor(Math.random() * 4) - 1,
    INT: 10 + Math.floor(Math.random() * 4) - 1,
    CHA: 10 + Math.floor(Math.random() * 4) - 1,
    PER: 10 + Math.floor(Math.random() * 4) - 1,
  }));
  
  const [allocated, setAllocated] = useState<CharacterStats>({ STR: 0, DEX: 0, CON: 0, INT: 0, CHA: 0, PER: 0 });

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
    if (allocated[key] > 0) {
      setAllocated(prev => ({ ...prev, [key]: prev[key] - 1 }));
      setPool(p => p + 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fadeIn w-full">
      <div className="text-center mb-8">
         <h1 className="cinzel text-3xl font-bold text-zinc-100">Forging Your Hero</h1>
         <p className="text-zinc-400 mt-2">
           Fate has granted you base attributes. Use your <span className="text-amber-400 font-bold">{pool}</span> remaining points to hone your skills.
         </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        {(Object.keys(STAT_LABELS) as Array<keyof CharacterStats>).map((key) => (
          <div key={key} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:border-zinc-700 transition-colors">
            
            {/* Icon & Name */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="cinzel font-bold text-xl text-zinc-200 w-32">{STAT_LABELS[key]}</h3>
                <span className={`text-xs px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono`}>
                  MOD: <span className={getMod(getTotal(key)) >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatMod(getTotal(key))}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{STAT_DESC[key]}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 sm:gap-6 bg-black/30 p-2 rounded-lg border border-zinc-800/50 justify-center">
               <button 
                 onClick={() => handleRemove(key)}
                 disabled={allocated[key] === 0}
                 className="w-8 h-8 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
               >
                 <Minus size={16} />
               </button>
               
               <div className="text-center w-12">
                 <span className="text-2xl font-bold font-mono text-amber-500">{getTotal(key)}</span>
                 <div className="text-[10px] text-zinc-600 uppercase">Score</div>
               </div>

               <button 
                 onClick={() => handleAdd(key)}
                 disabled={pool === 0 || getTotal(key) >= 20}
                 className="w-8 h-8 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
               >
                 <Plus size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => onComplete({
            STR: getTotal('STR'),
            DEX: getTotal('DEX'),
            CON: getTotal('CON'),
            INT: getTotal('INT'),
            CHA: getTotal('CHA'),
            PER: getTotal('PER'),
          })}
          className="flex items-center gap-3 px-8 py-4 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-bold cinzel text-lg shadow-lg shadow-amber-900/20 transition-all hover:scale-105"
        >
          <PlayCircle size={24} />
          Begin Adventure
        </button>
      </div>
    </div>
  );
};
