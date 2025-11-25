
import React, { useEffect, useState } from 'react';

interface SkillCheckWheelProps {
  modifier: number;
  target: number; // DC
  statLabel: string; // e.g. "STR"
  onComplete: (total: number) => void;
}

export const SkillCheckWheel: React.FC<SkillCheckWheelProps> = ({ modifier, target, statLabel, onComplete }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [resultTotal, setResultTotal] = useState<number | null>(null);

  // 1. Calculate Success Chance
  // Success if Roll (1-20) >= Target - Modifier
  const neededRoll = target - modifier;
  // Chance = (21 - neededRoll) / 20.
  // Clamp between 5% and 95%
  const successChance = Math.max(0.05, Math.min(0.95, (21 - neededRoll) / 20));
  
  // 2. Convert to Degrees
  // Success Zone Size (Green)
  const successDegrees = successChance * 360;
  
  // Determine if it is a success BEFORE spinning
  const rawRoll = Math.floor(Math.random() * 20) + 1;
  const total = rawRoll + modifier;
  const isSuccess = total >= target;

  useEffect(() => {
    setResultTotal(total);

    // 3. Determine Final Landing Angle
    // The Wheel rotates. The "Pointer" is fixed at the TOP (0 degrees in standard circle logic, or -90 deg depending on CSS).
    // Let's assume Pointer is at Top Center.
    // CSS Rotation: transform: rotate(Xdeg).
    // Visual: 
    //   Green Zone: starts at 0deg relative to Wheel, spans `successDegrees`.
    //   Red Zone: starts at `successDegrees`, spans rest.
    //
    // If we want to land on Green (Success):
    //   The part of the wheel at the TOP must be within [0, successDegrees].
    //   If the wheel is rotated by R, the angle at the top is (-R % 360). 
    //   Easier logic: We want the final rotation R such that (360 - (R % 360)) is inside the target zone.
    
    let targetAngleOnWheel = 0;

    if (isSuccess) {
       // Pick a random spot in the green zone (0 to successDegrees)
       // Add padding so it doesn't land exactly on the line
       targetAngleOnWheel = Math.random() * (successDegrees - 10) + 5; 
    } else {
       // Pick a random spot in the red zone (successDegrees to 360)
       targetAngleOnWheel = successDegrees + Math.random() * (360 - successDegrees - 10) + 5;
    }

    // To bring `targetAngleOnWheel` to the TOP (0 deg), we must rotate the wheel backward by `targetAngleOnWheel`.
    // Or rotate forward by `360 - targetAngleOnWheel`.
    const finalRotationWithinCircle = 360 - targetAngleOnWheel;

    // Add multiple full spins (e.g., 5-8 spins)
    const spins = 5 + Math.floor(Math.random() * 3);
    const totalRotation = (spins * 360) + finalRotationWithinCircle;

    // Trigger animation
    setTimeout(() => {
        setRotation(totalRotation);
    }, 100); // Slight delay to ensure render

    // Finish
    const duration = 4000; // matches CSS transition
    setTimeout(() => {
        setIsSpinning(false);
        setTimeout(() => {
            onComplete(rawRoll);
        }, 1500); // Wait 1.5s after stop to read result
    }, duration + 100);

  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div className="flex flex-col items-center relative">
         
         <div className="text-center mb-12 animate-slideDown">
             <h2 className="text-4xl cinzel font-bold text-zinc-100 tracking-wider mb-2">
                 {statLabel} CHECK
             </h2>
             <div className="text-amber-500 font-mono text-sm tracking-[0.3em] font-bold">
                 DIFFICULTY {target}
             </div>
             <div className="text-zinc-500 text-xs mt-2 uppercase tracking-wide">
                 Success Chance: {Math.round(successChance * 100)}%
             </div>
         </div>

         {/* Wheel Container */}
         <div className="relative">
             
             {/* The Pointer (Fixed) */}
             <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                 <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-zinc-100 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"></div>
             </div>

             {/* The Wheel */}
             <div 
                className="w-80 h-80 rounded-full border-8 border-zinc-800 shadow-2xl relative transition-transform duration-[4000ms] cubic-bezier(0.15, 0, 0.15, 1)"
                style={{ 
                    transform: `rotate(${rotation}deg)`,
                    background: `conic-gradient(#10b981 0deg ${successDegrees}deg, #ef4444 ${successDegrees}deg 360deg)`
                }}
             >
                {/* Inner Hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-zinc-900 rounded-full border-4 border-zinc-700 flex items-center justify-center z-10 shadow-lg">
                    <span className="font-mono text-zinc-500 font-bold text-lg">
                        {modifier >= 0 ? '+' : ''}{modifier}
                    </span>
                </div>
                
                {/* Decorative Lines/Dots (Optional visual flare) */}
                <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
             </div>

         </div>

         {/* Result Display */}
         {!isSpinning && resultTotal !== null && (
             <div className="mt-12 animate-slideUp text-center absolute -bottom-32">
                 <div className={`text-6xl font-black cinzel tracking-wider drop-shadow-lg ${isSuccess ? 'text-emerald-500' : 'text-red-600'}`}>
                     {isSuccess ? 'SUCCESS' : 'FAILURE'}
                 </div>
                 <div className="mt-2 text-zinc-400 font-mono text-sm uppercase tracking-widest">
                     Rolled {rawRoll} + {modifier} = {resultTotal}
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};
