
import React, { useEffect, useState } from 'react';

interface DiceRollerProps {
  modifier: number;
  target: number; // The DC
  statLabel: string;
  onComplete: (total: number) => void;
  precalculatedRoll?: number;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({ modifier, target, statLabel, onComplete, precalculatedRoll }) => {
  const [currentNumber, setCurrentNumber] = useState(1);
  const [isRolling, setIsRolling] = useState(true);
  const [phase, setPhase] = useState<'spin' | 'slow' | 'result'>('spin');
  const [finalResult, setFinalResult] = useState<{ raw: number, total: number } | null>(null);

  useEffect(() => {
    // 1. Determine outcome immediately (hidden from user)
    const rawRoll = precalculatedRoll !== undefined ? precalculatedRoll : (Math.floor(Math.random() * 20) + 1);
    const calculatedTotal = rawRoll + modifier;
    
    // 2. Animation Variables
    let timeoutId: number;
    let frameId: number;
    let startTime = Date.now();
    let duration = 2500; // Base spin duration
    let speed = 50; // Initial speed (ms per number switch)
    
    // Physics decay function
    const animate = () => {
       const now = Date.now();
       const elapsed = now - startTime;

       if (elapsed < duration) {
           // Fast Spin Phase
           setCurrentNumber(Math.floor(Math.random() * 20) + 1);
           frameId = window.setTimeout(animate, speed);
       } else if (elapsed < duration + 1000) {
           // Slow Down Phase (Tension)
           setPhase('slow');
           // Increase delay exponentially to simulate friction
           speed = Math.floor(speed * 1.5); 
           setCurrentNumber(Math.floor(Math.random() * 20) + 1);
           frameId = window.setTimeout(animate, speed);
       } else {
           // Final Result Phase
           setPhase('result');
           setCurrentNumber(rawRoll);
           setFinalResult({ raw: rawRoll, total: calculatedTotal });
           setIsRolling(false);
           
           // Notify parent after viewing result
           timeoutId = window.setTimeout(() => {
               onComplete(rawRoll);
           }, 2500);
       }
    };

    // Start animation loop
    animate();

    return () => {
        clearTimeout(frameId);
        clearTimeout(timeoutId);
    };
  }, [modifier, onComplete]);

  const displayTotal = finalResult ? finalResult.total : (currentNumber + modifier);
  const isSuccess = finalResult ? finalResult.total >= target : false;
  
  // Close call logic
  let closeCallText = "";
  if (finalResult) {
      const diff = finalResult.total - target;
      if (diff >= 0 && diff <= 1) closeCallText = "BARELY MADE IT!";
      else if (diff >= 2 && diff <= 3) closeCallText = "A CLOSE SHAVE!";
      else if (diff < 0 && diff >= -1) closeCallText = "HEARTBREAKINGLY CLOSE!";
      else if (diff < 0 && diff >= -3) closeCallText = "SO CLOSE YET SO FAR!";
      else if (diff >= 10) closeCallText = "CRUSHING VICTORY!";
      else if (diff <= -10) closeCallText = "CATASTROPHIC FAILURE!";
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="flex flex-col items-center w-full max-w-md p-8 relative">
        
        {/* Header - Enhanced Visibility */}
        <div className="text-center mb-10 flex flex-col items-center animate-slideDown">
            <h2 className="text-4xl cinzel font-bold text-zinc-100 tracking-[0.2em] uppercase mb-4">
                {statLabel} Check
            </h2>
            
            <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-700 rounded-lg px-8 py-3 shadow-xl">
                <div className="flex flex-col items-center">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Target To Beat</span>
                    <span className="text-3xl font-bold font-mono text-amber-500">{target}</span>
                </div>
            </div>
        </div>

        {/* The Dice Visual */}
        <div className="relative mb-12 group perspective-1000">
            {/* Pulsing Rings */}
            {isRolling && (
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping opacity-50"></div>
            )}
            
            {/* Main Hexagon Container */}
            <div className={`
                relative w-48 h-48 flex items-center justify-center transition-all duration-300 transform
                ${phase === 'spin' ? 'scale-100' : phase === 'slow' ? 'scale-110' : 'scale-125'}
            `}>
                {/* Background Shape */}
                <div className={`
                    absolute inset-0 transform rotate-45 rounded-3xl border-8 backdrop-blur-sm transition-colors duration-500
                    ${phase !== 'result' ? 'border-zinc-700 bg-zinc-900/50' : isSuccess ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-600 bg-red-900/30'}
                `}></div>
                
                {/* Number - REMOVED BLUR */}
                <span className={`
                    relative z-10 text-8xl font-black font-mono tracking-tighter transition-all duration-100
                    ${phase === 'spin' ? 'text-zinc-300' : ''}
                    ${phase === 'result' ? (isSuccess ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]') : 'text-zinc-200'}
                `}>
                    {currentNumber}
                </span>

                {/* Mod Badge */}
                <div className="absolute -right-8 top-0 bg-zinc-800 border-2 border-zinc-600 rounded-xl w-16 h-16 flex flex-col items-center justify-center shadow-lg">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Mod</span>
                    <span className="text-xl text-zinc-200 font-bold font-mono">
                        {modifier >= 0 ? '+' : ''}{modifier}
                    </span>
                </div>
            </div>
        </div>

        {/* Result Breakdown */}
        <div className="h-32 w-full flex flex-col items-center justify-center">
             {!finalResult ? (
                 <div className="text-zinc-500 animate-pulse font-mono tracking-widest text-sm uppercase">
                     Rolling Fate...
                 </div>
             ) : (
                 <div className="flex flex-col items-center animate-slideUp">
                     <div className="flex items-baseline gap-3 mb-2">
                         <span className="text-zinc-500 text-lg uppercase tracking-wider font-bold">Total</span>
                         <span className={`text-6xl font-bold cinzel ${isSuccess ? 'text-emerald-500' : 'text-red-500'}`}>
                             {displayTotal}
                         </span>
                     </div>
                     <div className={`px-8 py-2 rounded-lg text-lg font-bold tracking-[0.2em] uppercase border-2 shadow-lg ${isSuccess ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-red-950 border-red-500 text-red-400'}`}>
                         {isSuccess ? 'SUCCESS' : 'FAILURE'}
                     </div>
                     
                     {/* Close Call Text */}
                     {closeCallText && (
                         <div className={`mt-4 text-sm font-black tracking-widest animate-pulse ${isSuccess ? 'text-emerald-300' : 'text-red-300'}`}>
                             {closeCallText}
                         </div>
                     )}
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};
