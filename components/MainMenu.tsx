
import React, { useRef } from 'react';
import { Sword, Upload } from 'lucide-react';

interface MainMenuProps {
  onNewGame: () => void;
  onLoadGame: (file: File) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onNewGame, onLoadGame }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadGame(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 text-zinc-100 space-y-12 animate-fadeIn relative z-10">
      {/* Background effects could go here */}
      
      <div className="text-center space-y-4 animate-slideDown">
        <h1 className="cinzel text-6xl md:text-8xl font-bold text-amber-500 tracking-wider drop-shadow-lg">
          Infinite<br/>Adventure
        </h1>
        <p className="text-zinc-400 text-xl font-serif italic tracking-widest">
          Where every choice writes history
        </p>
      </div>
      
      <div className="flex flex-col gap-6 w-full max-w-xs animate-slideUp delay-100">
        <button 
          onClick={onNewGame}
          className="group flex items-center justify-center gap-4 px-8 py-5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-bold cinzel text-xl shadow-xl shadow-black/50 transition-all hover:scale-105 hover:shadow-amber-900/20"
        >
          <Sword size={24} className="group-hover:rotate-45 transition-transform duration-300" />
          New Adventure
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-4 px-8 py-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg font-bold cinzel text-xl border border-zinc-800 hover:border-zinc-700 transition-all"
        >
          <Upload size={24} />
          Load Game
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json" 
          className="hidden" 
        />
      </div>
      
      <div className="absolute bottom-8 text-zinc-600 text-xs font-mono uppercase tracking-widest">
        Powered by Gemini 3 Pro
      </div>
    </div>
  );
};
