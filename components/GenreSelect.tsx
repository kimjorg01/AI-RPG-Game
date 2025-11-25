
import React, { useState } from 'react';
import { Sword, Zap, Skull, Biohazard, Wand2, Crown, PenTool, ArrowRight, X } from 'lucide-react';

interface GenreSelectProps {
  onSelect: (genre: string) => void;
}

const GENRES = [
  { id: 'High Fantasy', icon: <Sword size={32} />, desc: "Dragons, magic, and medieval kingdoms.", color: "text-amber-500", bg: "hover:border-amber-500" },
  { id: 'Cyberpunk', icon: <Zap size={32} />, desc: "High tech, low life. Neon lights and corporate warfare.", color: "text-cyan-400", bg: "hover:border-cyan-400" },
  { id: 'Eldritch Horror', icon: <Skull size={32} />, desc: "Madness, ancient gods, and the unknown.", color: "text-purple-500", bg: "hover:border-purple-500" },
  { id: 'Post-Apocalyptic', icon: <Biohazard size={32} />, desc: "Survival in a ruined world.", color: "text-green-600", bg: "hover:border-green-600" },
  { id: 'Urban Fantasy', icon: <Wand2 size={32} />, desc: "Magic hidden in the modern world.", color: "text-pink-500", bg: "hover:border-pink-500" },
  { id: 'Medieval History', icon: <Crown size={32} />, desc: "Realistic historical adventure without magic.", color: "text-red-500", bg: "hover:border-red-500" },
  { id: 'Custom', icon: <PenTool size={32} />, desc: "Define your own universe and rules.", color: "text-zinc-100", bg: "hover:border-zinc-100" },
];

export const GenreSelect: React.FC<GenreSelectProps> = ({ onSelect }) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onSelect(customInput.trim());
    }
  };

  if (isCustom) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center animate-fadeIn">
         <h1 className="cinzel text-4xl font-bold text-zinc-100 mb-2">Custom World</h1>
         <p className="text-zinc-400 mb-8">Describe the setting, tone, or specific scenario you want to play.</p>
         
         <form onSubmit={handleCustomSubmit} className="relative">
            <textarea 
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. A noir detective story set on a colony on Mars in the year 2099..."
              className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors resize-none shadow-inner text-lg"
              autoFocus
            />
            <div className="flex gap-3 mt-6 justify-center">
               <button
                 type="button"
                 onClick={() => setIsCustom(false)}
                 className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 transition-colors"
               >
                 <X size={20} />
                 Cancel
               </button>
               <button
                 type="submit"
                 disabled={!customInput.trim()}
                 className="flex items-center gap-2 px-8 py-3 bg-amber-700 hover:bg-amber-600 text-white rounded font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
               >
                 Begin Journey
                 <ArrowRight size={20} />
               </button>
            </div>
         </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 text-center animate-fadeIn">
      <h1 className="cinzel text-4xl font-bold text-zinc-100 mb-2">Choose Your Tale</h1>
      <p className="text-zinc-400 mb-8">Select the world you wish to inhabit.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GENRES.map((g) => (
          <button
            key={g.id}
            onClick={() => g.id === 'Custom' ? setIsCustom(true) : onSelect(g.id)}
            className={`
              p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-left transition-all duration-300 group
              hover:bg-zinc-800 ${g.bg} hover:scale-[1.02] shadow-lg relative overflow-hidden
            `}
          >
            <div className={`mb-4 ${g.color} p-3 bg-zinc-950 rounded-full inline-block border border-zinc-800 z-10 relative`}>
              {g.icon}
            </div>
            <h3 className="text-xl font-bold text-zinc-200 mb-2 cinzel z-10 relative">{g.id}</h3>
            <p className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors z-10 relative">
              {g.desc}
            </p>
            
            {/* Subtle texture or gradient effect on hover could go here */}
          </button>
        ))}
      </div>
    </div>
  );
};
