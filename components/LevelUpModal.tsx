
import React, { useState } from 'react';
import { CharacterStats, StatType } from '../types';
import { ArrowUpCircle, Check } from 'lucide-react';

interface LevelUpModalProps {
  pendingCount: number;
  currentStats: CharacterStats;
  onLevelUp: (stat: StatType) => void;
}

const STAT_LABELS: Record<StatType, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  CHA: "Charisma",
  PER: "Perception",
  LUK: "Luck"
};

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ pendingCount, currentStats, onLevelUp }) => {
  if (pendingCount <= 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-900 border border-amber-500/50 rounded-xl p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] relative overflow-hidden">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-950/50 border border-amber-500/50 mb-4 animate-bounce">
                <ArrowUpCircle size={32} className="text-amber-400" />
            </div>
            <h2 className="text-3xl cinzel font-bold text-amber-100 mb-2">Level Up Available!</h2>
            <p className="text-amber-500/80 font-serif italic">
                You have <span className="font-bold text-amber-400">{pendingCount}</span> point{pendingCount > 1 ? 's' : ''} to spend. Choose an attribute to improve.
            </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {(Object.keys(STAT_LABELS) as StatType[]).map((stat) => (
                <button
                    key={stat}
                    onClick={() => onLevelUp(stat)}
                    className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-950/10 rounded-lg group transition-all"
                >
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-zinc-300 group-hover:text-amber-200 transition-colors">
                            {STAT_LABELS[stat]}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                            Current: {currentStats[stat]}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            +1
                        </span>
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:border-amber-500 group-hover:text-amber-500 transition-colors">
                            <Check size={16} />
                        </div>
                    </div>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};
