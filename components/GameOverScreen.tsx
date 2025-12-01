
import React, { useMemo, useEffect } from 'react';
import { StoryTurn, CharacterStats, GameStatus } from '../types';
import { Trophy, Skull, Download, RotateCcw, TrendingUp, Activity, Sparkles, Image as ImageIcon, X } from 'lucide-react';

interface GameOverScreenProps {
  isOpen: boolean;
  onClose: () => void;
  gameStatus: GameStatus;
  history: StoryTurn[];
  stats: CharacterStats;
  startingStats: CharacterStats;
  hpHistory: number[];
  statHistory?: CharacterStats[];
  maxHp: number;
  summary: string | undefined;
  storyboardUrl: string | undefined;
  onDownloadLog: () => void;
  onRestart: () => void;
  onRegenerateImage: () => void;
}

const STAT_COLORS: Record<keyof CharacterStats, string> = {
    STR: '#ef4444', // Red
    DEX: '#10b981', // Emerald
    CON: '#f97316', // Orange
    INT: '#3b82f6', // Blue
    CHA: '#a855f7', // Purple
    PER: '#06b6d4', // Cyan
    LUK: '#eab308'  // Yellow
};

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ 
  isOpen,
  onClose,
  gameStatus, 
  history, 
  stats, 
  startingStats, 
  hpHistory, 
  statHistory = [],
  maxHp,
  summary,
  storyboardUrl,
  onDownloadLog, 
  onRestart,
  onRegenerateImage
}) => {
  
  // Debug logging to check if component receives data
  useEffect(() => {
      if (isOpen) {
          console.log("GameOverScreen Open", { gameStatus, stats, statHistoryLength: statHistory?.length });
      }
  }, [isOpen, gameStatus, stats, statHistory]);

  // Safe Data Preparation
  const safeHpHistory = useMemo(() => {
      if (!Array.isArray(hpHistory)) return [0];
      return hpHistory.filter(h => typeof h === 'number' && !isNaN(h));
  }, [hpHistory]);

  const safeStatHistory = useMemo(() => {
      if (!Array.isArray(statHistory)) return [];
      // Filter out any undefined/null entries that might have crept in
      return statHistory.filter(s => s && typeof s === 'object');
  }, [statHistory]);

  // HP Graph Path
  const hpGraphPath = useMemo(() => {
    if (safeHpHistory.length < 2) return "";
    const width = 100; 
    const height = 50; 
    const totalPoints = safeHpHistory.length;
    const safeMaxHp = maxHp || 100; // Prevent division by zero
    
    const points = safeHpHistory.map((hp, index) => {
       const x = (index / (totalPoints - 1)) * width;
       const normalizedHp = Math.max(0, Math.min(hp, safeMaxHp)); // Clamp between 0 and maxHp
       const y = height - ((normalizedHp / safeMaxHp) * height);
       return `${x},${y}`;
    }).join(" ");

    return `M ${points}`;
  }, [safeHpHistory, maxHp]);

  // Stat Growth Graph Paths
  const statGraphPaths = useMemo(() => {
      if (safeStatHistory.length === 0) return [];
      
      // If we have 1 item, duplicate it so we can draw a line
      const historyToUse = safeStatHistory.length === 1 
          ? [safeStatHistory[0], safeStatHistory[0]] 
          : safeStatHistory;
      
      const width = 100;
      const height = 50;
      const totalPoints = historyToUse.length;
      
      // Find the maximum stat value across all history to scale the graph dynamically
      let maxStatVal = 20; 
      try {
        historyToUse.forEach(s => {
            if (!s) return;
            Object.values(s).forEach(v => {
                if (typeof v === 'number' && !isNaN(v) && v > maxStatVal) maxStatVal = v;
            });
        });
      } catch (e) {
          console.error("Error calculating max stat", e);
      }
      
      return (Object.keys(STAT_COLORS) as Array<keyof CharacterStats>).map(statKey => {
          try {
            const points = historyToUse.map((statSnapshot, index) => {
                const val = statSnapshot ? (statSnapshot[statKey] || 0) : 0;
                const x = (index / (totalPoints - 1)) * width;
                const y = height - (Math.min(val, maxStatVal) / maxStatVal) * height;
                return `${x},${y}`;
            }).join(" ");
            
            return {
                key: statKey,
                d: `M ${points}`,
                color: STAT_COLORS[statKey]
            };
          } catch (e) {
              console.error("Error generating path for", statKey, e);
              return { key: statKey, d: "", color: STAT_COLORS[statKey] };
          }
      });
  }, [safeStatHistory]);

  const getStatChange = (key: keyof CharacterStats) => {
      if (!stats || !startingStats) return <span className="text-zinc-600 text-xs">-</span>;
      const current = stats[key] || 0;
      const start = startingStats[key] || 0;
      const diff = current - start;
      
      if (diff > 0) return <span className="text-emerald-400 text-xs">+{diff}</span>;
      if (diff < 0) return <span className="text-red-400 text-xs">{diff}</span>;
      return <span className="text-zinc-600 text-xs">-</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] min-h-[300px] overflow-hidden">
            
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-colors z-10"
                aria-label="Close Summary"
            >
                <X size={24} />
            </button>

            <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar w-full h-full">
                <div className="flex flex-col items-center pb-12">
                
                {/* Header Icon */}
                <div className={`p-6 rounded-full mb-4 ${gameStatus === 'won' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                        {gameStatus === 'won' ? (
                            <Trophy size={64} className="text-amber-500" />
                        ) : (
                            <Skull size={64} className="text-red-500" />
                        )}
                </div>
                
                {/* Title */}
                <h2 className={`cinzel text-3xl md:text-5xl font-bold mb-2 text-center ${gameStatus === 'won' ? 'text-amber-500' : 'text-red-600'}`}>
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
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {summary || <span className="animate-pulse text-zinc-500">Inscribing the chronicles...</span>}
                    </p>
                </div>

                {/* Stats & Graph Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl mb-12">
                    
                    {/* Stat Progression & Graph */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col">
                        <h4 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <TrendingUp size={16} /> Ability Growth
                        </h4>
                        
                        {/* The Graph */}
                        <div className="w-full h-40 bg-black/40 rounded border border-zinc-800/50 mb-4 relative overflow-hidden">
                             {safeStatHistory.length > 0 ? (
                                <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                    {/* Grid lines */}
                                    <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#333" strokeWidth="0.2" strokeDasharray="2" />
                                    <line x1="0" y1="25" x2="100" y2="25" stroke="#333" strokeWidth="0.2" strokeDasharray="2" />
                                    <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#333" strokeWidth="0.2" strokeDasharray="2" />
                                    
                                    {statGraphPaths.map((path) => (
                                        <path 
                                            key={path.key}
                                            d={path.d} 
                                            fill="none" 
                                            stroke={path.color} 
                                            strokeWidth="1" 
                                            vectorEffect="non-scaling-stroke"
                                            opacity="0.8"
                                        />
                                    ))}
                                </svg>
                             ) : (
                                 <div className="flex items-center justify-center h-full text-zinc-600 text-xs">Not enough data for graph</div>
                             )}
                        </div>

                        {/* Legend / Current Stats */}
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {stats && Object.keys(stats).map((key) => {
                                const k = key as keyof CharacterStats;
                                return (
                                    <div key={key} className="flex flex-col items-center bg-black/40 p-2 rounded border border-zinc-800">
                                        <span className="text-[10px] font-bold" style={{ color: STAT_COLORS[k] }}>{k}</span>
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
                        <div className="flex-1 w-full relative min-h-[120px] bg-black/40 rounded border border-zinc-800/50">
                            {safeHpHistory.length > 1 ? (
                                <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                    {/* Grid lines */}
                                    <line x1="0" y1="25" x2="100" y2="25" stroke="#333" strokeWidth="0.5" strokeDasharray="2" />
                                    
                                    {/* The Line */}
                                    <path 
                                        d={hpGraphPath} 
                                        fill="none" 
                                        stroke={gameStatus === 'won' ? '#f59e0b' : '#ef4444'} 
                                        strokeWidth="1.5" 
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    
                                    {/* End Dot */}
                                    <circle 
                                        cx="100" 
                                        cy={50 - ((safeHpHistory[safeHpHistory.length-1] / (maxHp || 100)) * 50)} 
                                        r="2" 
                                        fill={gameStatus === 'won' ? '#f59e0b' : '#ef4444'} 
                                    />
                                </svg>
                            ) : (
                                <div className="flex items-center justify-center h-full text-zinc-600 text-xs">Not enough data for graph</div>
                            )}
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-600 mt-1 px-1">
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
                <div className="flex flex-wrap justify-center gap-4 mb-4">
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
            </div>
        </div>
    </div>
  );
};
