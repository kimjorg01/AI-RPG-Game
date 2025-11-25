
import React, { useEffect, useRef } from 'react';
import { StoryTurn } from '../types';
import { Sparkles, Dices, CheckCircle2, XCircle, Plus, Minus, ArrowUpCircle } from 'lucide-react';

interface StoryFeedProps {
  history: StoryTurn[];
  isThinking: boolean;
}

// Simple text parser for bold markdown and emphasis
const parseText = (text: string) => {
    const parts = text.split(/(\*{1,2}[^*]+?\*{1,2})/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="text-zinc-100 font-bold tracking-wide">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <span key={index} className="text-amber-200 font-bold tracking-wide">{part.slice(1, -1)}</span>;
        }
        return part;
    });
};

export const StoryFeed: React.FC<StoryFeedProps> = ({ history, isThinking }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when history changes
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32">
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-50 space-y-4">
            <Sparkles size={48} />
            <p className="cinzel text-lg">Your adventure begins...</p>
        </div>
      )}

      {history.map((turn) => (
        <div key={turn.id} className="max-w-3xl mx-auto animate-fadeIn">
          {/* If it's a user choice, show it distinctly */}
          {turn.isUserTurn ? (
            <div className="flex flex-col items-end mb-6">
              <div className="bg-zinc-800 border border-zinc-700 px-6 py-3 rounded-2xl rounded-tr-sm text-zinc-300 italic shadow-lg">
                You chose: <span className="text-amber-400 not-italic font-medium">"{turn.text}"</span>
              </div>
              
              {/* Show roll result if applicable */}
              {turn.rollResult && (
                <div className={`mt-2 text-xs font-bold flex items-center gap-2 px-3 py-1 rounded-full border ${turn.rollResult.isSuccess ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-red-900/30 border-red-700 text-red-400'}`}>
                    <Dices size={12} />
                    {turn.rollResult.statType} CHECK ({turn.rollResult.total} vs DC {turn.rollResult.difficulty})
                    {turn.rollResult.isSuccess ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                </div>
              )}

              {/* LEVEL UP NOTIFICATION (FROM USAGE) */}
              {turn.levelUpEvent && (
                <div className="mt-3 bg-gradient-to-r from-amber-900/20 to-amber-900/40 border border-amber-600/50 px-4 py-2 rounded-lg flex items-center gap-3 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                   <ArrowUpCircle size={20} className="text-amber-400" />
                   <div className="flex flex-col">
                       <span className="text-amber-200 font-bold cinzel text-sm uppercase tracking-wider">
                           Ability Improved!
                       </span>
                       <span className="text-amber-400 text-xs">
                           Your usage of <span className="font-bold">{turn.levelUpEvent.stat}</span> increased it from {turn.levelUpEvent.oldValue} to {turn.levelUpEvent.newValue}.
                       </span>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Image Section */}
              {turn.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative group">
                  <img 
                    src={turn.imageUrl} 
                    alt="Scene illustration" 
                    className="w-full h-auto object-cover max-h-[500px] transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-zinc-400 line-clamp-1">{turn.imagePrompt}</p>
                  </div>
                </div>
              )}
              
              {/* Text Section */}
              <div className="prose prose-invert prose-lg max-w-none">
                 <p className="leading-relaxed text-zinc-200 font-serif whitespace-pre-line">
                   {parseText(turn.text)}
                 </p>
              </div>

              {/* Inventory Updates Badge */}
              {( (turn.inventoryAdded?.length || 0) > 0 || (turn.inventoryRemoved?.length || 0) > 0 ) && (
                <div className="flex flex-wrap gap-2 animate-fadeIn">
                    {turn.inventoryAdded?.map((item, idx) => (
                        <div key={`add-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/50 border border-emerald-800/50 rounded-full text-emerald-400 text-xs font-bold tracking-wide uppercase group relative cursor-help">
                            <Plus size={12} strokeWidth={3} />
                            {item.name}
                            
                            {/* Hover tooltip for stats */}
                            {item.bonuses && Object.keys(item.bonuses).length > 0 && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 border border-emerald-900/50 text-emerald-300 px-2 py-1 rounded text-[9px] opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                    {Object.entries(item.bonuses).map(([k, v]) => `+${v} ${k}`).join(', ')}
                                </div>
                            )}
                        </div>
                    ))}
                    {turn.inventoryRemoved?.map((item, idx) => (
                        <div key={`rem-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/50 border border-red-800/50 rounded-full text-red-400 text-xs font-bold tracking-wide uppercase">
                            <Minus size={12} strokeWidth={3} />
                            {item}
                        </div>
                    ))}
                </div>
              )}
              
              <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            </div>
          )}
        </div>
      ))}

      {isThinking && (
         <div className="max-w-3xl mx-auto flex items-center gap-3 text-amber-500/70 animate-pulse">
            <Sparkles size={18} className="animate-spin" />
            <span className="cinzel text-sm tracking-widest">The Dungeon Master is thinking...</span>
         </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
