
import React, { useMemo } from 'react';
import { StoryTurn, CharacterStats, GameStatus } from '../types';
import { Trophy, Skull, Download, RotateCcw, TrendingUp, Activity, Sparkles, Image as ImageIcon } from 'lucide-react';

interface GameOverScreenProps {
  gameStatus: GameStatus;
  history: StoryTurn[];
  stats: CharacterStats;
  startingStats: CharacterStats;
  hpHistory: number[];
  maxHp: number;
  summary: string | undefined;
  storyboardUrl: string | undefined;
  onDownloadLog: () => void;
  onRestart: () => void;
  onRegenerateImage: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ 
  gameStatus, 
  history, 
  stats, 
  startingStats, 
  hpHistory, 
  maxHp,
  summary,
  storyboardUrl,
  onDownloadLog, 
  onRestart,
  onRegenerateImage
}) => {
  
  // Helper to render the HP Graph SVG
  const graphPath = useMemo(() => {
    if (hpHistory.length < 2) return "";
    const width = 100; // ViewBox units
    const height = 50; 
    const totalPoints = hpHistory.length;
    
    const points = hpHistory.map((hp, index) => {
       const x = (index / (totalPoints - 1)) * width;
       const y = height - ((hp / maxHp) * height); // Invert Y because SVG 0 is top
       return `${x},${y}`;
    }).join(" ");

    return `M ${points}`;
  }, [hpHistory, maxHp]);

  const getStatChange = (key: keyof CharacterStats) => {
      const diff = stats[key] - startingStats[key];
      if (diff > 0) return <span className="text-emerald-400 text-xs">+{diff}</span>;
      if (diff < 0) return <span className="text-red-400 text-xs">{diff}</span>;
      return <span className="text-zinc-600 text-xs">-</span>;
  };

  return (
    <div className="flex flex-col items-center animate-fadeIn pb-12 px-4 md:px-8">
       
       {/* Header Icon */}
       <div className={`p-6 rounded-full mb-4 mt-8 ${gameStatus === 'won' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
            {gameStatus === 'won' ? (
                <Trophy size={64} className="text-amber-500" />
            ) : (
                <Skull size={64} className="text-red-500" />
            )}
       </div>
       
       {/* Title */}
       <h2 className={`cinzel text-4xl md:text-5xl font-bold mb-2 text-center ${gameStatus === 'won' ? 'text-amber-500' : 'text-red-600'}`}>
           {gameStatus === 'won' ? 'VICTORY ACHIEVED' : 'YOU HAVE DIED'}
       </h2>
       
       <p className="text-zinc-400 text-center max-w-lg mb-8 font-serif italic">
           {gameStatus === 'won' 
             ? "Your legend will be sung for generations." 
             : "Your story ends here, but the world spins on."}
       </p>

       {/* AI Summary */}
       <div className="w-full max-w-3xl bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg mb-8 shadow-lg">
           <h3 className="cinzel text-lg font-bold text-zinc-300 mb-3 border-b border-zinc-800 pb-2">Epilogue</h3>
           <p className="text-zinc-300 leading-relaxed">
               {summary || <span className="animate-pulse text-zinc-500">Inscribing the chronicles...</span>}
           </p>
       </div>

       {/* Stats & Graph Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12">
           
           {/* Stat Progression */}
           <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
               <h4 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                   <TrendingUp size={16} /> Ability Growth
               </h4>
               <div className="grid grid-cols-5 gap-2">
                   {Object.keys(stats).map((key) => {
                       const k = key as keyof CharacterStats;
                       return (
                           <div key={key} className="flex flex-col items-center bg-black/40 p-2 rounded border border-zinc-800">
                               <span className="text-[10px] font-bold text-zinc-500">{k}</span>
                               <span className="font-bold cinzel text-zinc-200">{stats[k]}</span>
                               {getStatChange(k)}
                           </div>
                       );
                   })}
               </div>
           </div>

           {/* HP Graph */}
           <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg relative overflow-hidden flex flex-col">
               <h4 className="text-sm font-bold text-zinc-400 mb-2 flex items-center gap-2 uppercase tracking-wider">
                   <Activity size={16} /> Health History
               </h4>
               <div className="flex-1 w-full relative min-h-[80px]">
                   {hpHistory.length > 1 && (
                       <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                           {/* Grid lines */}
                           <line x1="0" y1="25" x2="100" y2="25" stroke="#333" strokeWidth="0.5" strokeDasharray="2" />
                           
                           {/* The Line */}
                           <path 
                             d={graphPath} 
                             fill="none" 
                             stroke={gameStatus === 'won' ? '#f59e0b' : '#ef4444'} 
                             strokeWidth="1.5" 
                             vectorEffect="non-scaling-stroke"
                           />
                           
                           {/* End Dot */}
                           <circle 
                             cx="100" 
                             cy={50 - ((hpHistory[hpHistory.length-1] / maxHp) * 50)} 
                             r="2" 
                             fill={gameStatus === 'won' ? '#f59e0b' : '#ef4444'} 
                           />
                       </svg>
                   )}
               </div>
               <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                   <span>Start</span>
                   <span>End</span>
               </div>
           </div>
       </div>

       {/* Storyboard Section */}
       <div className="w-full max-w-5xl border-t border-zinc-800 pt-8 mb-12">
            <div className="flex items-center justify-center gap-4 mb-6 relative">
                <h3 className="cinzel text-xl font-bold text-zinc-300 flex items-center gap-2">
                    <ImageIcon size={20} />
                    Visual Legend
                </h3>
                {summary && (
                    <button 
                        onClick={onRegenerateImage}
                        className="absolute right-0 md:static p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors border border-zinc-700"
                        title="Regenerate Image"
                    >
                        <RotateCcw size={16} />
                    </button>
                )}
            </div>
            
            <div className="w-full aspect-video bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden flex items-center justify-center relative shadow-2xl">
                {storyboardUrl ? (
                    <img src={storyboardUrl} alt="Epic Comic Storyboard" className="w-full h-full object-contain animate-fadeIn" />
                ) : summary ? (
                    <div className="flex flex-col items-center gap-4 text-zinc-500 animate-pulse">
                        <Sparkles size={48} />
                        <span className="cinzel text-lg">Illustrating your final legend...</span>
                        <span className="text-xs text-zinc-600 font-mono">(This may take a moment)</span>
                    </div>
                ) : (
                    <div className="text-zinc-700 italic">Waiting for history to be written...</div>
                )}
            </div>
       </div>

       {/* Action Buttons */}
       <div className="flex gap-4 mb-12">
           <button 
             onClick={onDownloadLog}
             className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-200 font-bold border border-zinc-700 transition-colors"
           >
               <Download size={18} />
               Download Log
           </button>
           <button 
             onClick={() => {
                if(window.confirm("Start a new adventure?")) {
                    onRestart();
                }
             }}
             className="flex items-center gap-2 px-6 py-3 bg-amber-700 hover:bg-amber-600 rounded-md text-white font-bold shadow-lg transition-colors hover:scale-105"
           >
               <RotateCcw size={18} />
               New Adventure
           </button>
       </div>
    </div>
  );
};
