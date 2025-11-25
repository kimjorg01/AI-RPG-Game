
import React, { useEffect, useRef, useState } from 'react';
import { StatType } from '../types';

interface SkillCheckBarProps {
  modifier: number;
  target: number; // DC
  statLabel: string; // e.g. "STR"
  onComplete: (total: number) => void;
}

export const SkillCheckBar: React.FC<SkillCheckBarProps> = ({ modifier, target, statLabel, onComplete }) => {
  const [position, setPosition] = useState(0); // 0 to 100
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<'rolling' | 'slowing' | 'stopped'>('rolling');
  const [resultTotal, setResultTotal] = useState<number | null>(null);

  // Math logic for Win/Loss areas
  // D&D Logic: Success if Roll(1-20) + Mod >= DC
  // Threshold Roll (Minimum d20 roll needed) = DC - Mod.
  // Example: DC 15, Mod +5. Need roll >= 10.
  // Chance of success = (21 - 10) / 20 = 11/20 = 55%.
  // VISUAL: 0-55% is Green (Success), 56-100% is Red (Fail).
  const neededRoll = target - modifier;
  const winChance = Math.max(0.05, Math.min(0.95, (21 - neededRoll) / 20)); // Clamp between 5% and 95%
  const successThreshold = winChance * 100;

  useEffect(() => {
    // 1. Pre-calculate result
    const rawRoll = Math.floor(Math.random() * 20) + 1;
    const total = rawRoll + modifier;
    const isSuccess = total >= target;
    setResultTotal(total);

    // 2. Animation Loop
    let animationId: number;
    let startTime = Date.now();
    let velocity = 250; // Speed of cursor movement
    let currentPos = 50;
    
    // Determine target landing spot based on result
    let finalLandingSpot = 0;
    if (isSuccess) {
       // Land somewhere in 0 to successThreshold (minus padding)
       finalLandingSpot = Math.random() * (successThreshold - 5); 
    } else {
       // Land somewhere in successThreshold to 100
       finalLandingSpot = Math.min(100, Math.max(successThreshold + 2, successThreshold + (Math.random() * (100 - successThreshold))));
    }

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed < 1500) {
        // Phase 1: Sporadic Jitter / Fast Movement
        // Move randomly around center with high noise
        const noise = (Math.random() - 0.5) * 50; 
        // Use sine wave for base movement + noise
        const base = 50 + Math.sin(elapsed * 0.02) * 40;
        currentPos = Math.max(0, Math.min(100, base + noise));
        setPosition(currentPos);
        animationId = requestAnimationFrame(animate);
      } else if (elapsed < 3000) {
        // Phase 2: Slow down and converge to target
        if (status !== 'slowing') setStatus('slowing');
        
        // Linear interpolation to final spot
        const progress = (elapsed - 1500) / 1500; // 0 to 1
        const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        
        // Lerp from last chaotic pos to final spot
        // But to make it smooth, let's just lerp from current to final with a "braking" feel
        const dist = finalLandingSpot - currentPos;
        currentPos += dist * 0.1; // Ease to target
        
        // Zoom effect starts here
        setScale(1 + (progress * 0.5)); // Zoom to 1.5x

        setPosition(currentPos);
        animationId = requestAnimationFrame(animate);
      } else {
        // Phase 3: Stop
        setStatus('stopped');
        setPosition(finalLandingSpot);
        setTimeout(() => {
            onComplete(rawRoll);
        }, 1500);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, []);

  const isSuccessResult = resultTotal !== null && resultTotal >= target;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn overflow-hidden">
      
      {/* Zoom Container */}
      <div 
        className="relative w-full max-w-2xl px-8 flex flex-col items-center transition-transform duration-100 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="text-center mb-8 transform transition-opacity duration-300" style={{ opacity: status === 'slowing' ? 0.5 : 1 }}>
             <h2 className="text-4xl cinzel font-bold text-zinc-100 tracking-wider mb-2">
                 {statLabel} CHECK
             </h2>
             <div className="text-amber-500 font-mono text-sm tracking-[0.3em] font-bold">
                 DIFFICULTY {target}
             </div>
        </div>

        {/* The Bar */}
        <div className="w-full h-16 bg-zinc-900 rounded-lg border-2 border-zinc-700 relative overflow-hidden shadow-2xl">
            {/* Success Zone (Green) */}
            <div 
                className="absolute top-0 bottom-0 left-0 bg-emerald-900/40 border-r-2 border-emerald-500/50 transition-all duration-300"
                style={{ width: `${successThreshold}%` }}
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-20"></div>
                <span className="absolute top-2 left-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Success Zone</span>
            </div>

            {/* Failure Zone (Red) - implied by background, but let's make it explicit for contrast if needed or just leave dark */}
            <div 
                className="absolute top-0 bottom-0 right-0 bg-red-900/20"
                style={{ left: `${successThreshold}%` }}
            >
                 <span className="absolute top-2 right-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">Failure</span>
            </div>

            {/* The Arrow / Cursor */}
            <div 
                className="absolute top-0 bottom-0 w-1 z-20 transition-all duration-75 ease-linear will-change-transform"
                style={{ left: `${position}%` }}
            >
                {/* Line */}
                <div className="h-full w-full bg-zinc-100 shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
                
                {/* Triangle Top */}
                <div className="absolute -top-3 -left-2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-zinc-100 drop-shadow-lg"></div>
                
                {/* Triangle Bottom */}
                <div className="absolute -bottom-3 -left-2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[12px] border-b-zinc-100 drop-shadow-lg"></div>
            </div>
        </div>

        {/* Result Text */}
        {status === 'stopped' && (
            <div className="mt-12 animate-slideUp text-center">
                 <div className={`text-6xl font-black cinzel tracking-wider drop-shadow-lg ${isSuccessResult ? 'text-emerald-500' : 'text-red-600'}`}>
                     {isSuccessResult ? 'SUCCESS' : 'FAILURE'}
                 </div>
                 <div className="mt-2 text-zinc-500 font-mono text-xs uppercase tracking-widest">
                     Total {resultTotal} vs DC {target}
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};
